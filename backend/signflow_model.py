"""
signflow_model.py — загрузка и инференс модели SignFlow от Сбера.

Загрузка с Hugging Face: hf.co/sberbank-ai/SignFlow
Оптимизация для CPU через torch.quantization.
Кэширование модели в памяти при старте.
"""

import io
import base64
import time
import logging
from typing import Optional

import numpy as np
from PIL import Image

logger = logging.getLogger("SignFlow")

# ── Lazy-импорт torch ─────────────────────────────────────────────────
try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    from torchvision import transforms as T

    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None

# ── Устройство ────────────────────────────────────────────────────────
DEVICE = torch.device("cpu") if TORCH_AVAILABLE else None

# ── Конфигурация инференса ────────────────────────────────────────────
IMG_SIZE = 224          # размер входного фрейма (MobileNet)
MAX_INFERENCE_MS = 200  # таймаут распознавания (мс)
FRAME_STEP = 3          # обрабатывать каждый 3-й фрейм


# ── Минимальная реализация SignFlow ───────────────────────────────────
if TORCH_AVAILABLE:

    class SignFlowModel(nn.Module):
        """
        Упрощённая модель на базе MobileNetV3.
        В продакшене загружается веса с Hugging Face:
          https://huggingface.co/sberbank-ai/SignFlow

        Если веса не найдены — работает в эмуляционном режиме
        (возвращает случайный жест для демонстрации).
        """

        def __init__(self, num_classes: int = 1000):
            super().__init__()
            if TORCH_AVAILABLE:
                from torchvision.models import mobilenet_v3_small
                self.backbone = mobilenet_v3_small(weights=None, num_classes=num_classes)
            else:
                self.backbone = None
            self.num_classes = num_classes

        def forward(self, x):
            if self.backbone is not None:
                return self.backbone(x)
            B = x.size(0)
            return torch.randn(B, self.num_classes) * 0.1

    # ── Трансформация фрейма ──────────────────────────────────────────
    _transform = None

    def _get_transform():
        global _transform
        if _transform is None:
            _transform = T.Compose([
                T.Resize((IMG_SIZE, IMG_SIZE)),
                T.ToTensor(),
                T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ])
        return _transform

else:
    # Dummy classes when PyTorch is not available
    class SignFlowModel:
        def __init__(self, num_classes: int = 1000):
            self.num_classes = num_classes
            self.backbone = None
        def eval(self):
            pass

    def _get_transform():
        return None


# ── Глобальная модель (синглтон) ──────────────────────────────────────
_model: Optional[SignFlowModel] = None
_labels: list = []  # список названий жестов (индекс = class_id)


def load_model(force_reload: bool = False) -> SignFlowModel:
    """
    Загружает SignFlow с Hugging Face или создаёт эмулятор.
    Оптимизирует для CPU через torch.quantization.
    Вызывается один раз при старте сервера.
    """
    global _model

    if _model is not None and not force_reload:
        return _model

    if not TORCH_AVAILABLE:
        logger.warning("PyTorch не установлен. Работа в эмуляционном режиме.")
        _model = SignFlowModel(num_classes=1000)
        _model.eval()
        return _model

    logger.info("Загрузка SignFlow...")
    try:
        # Пытаемся загрузить веса с Hugging Face
        import huggingface_hub as hf

        model_path = hf.hf_hub_download(
            repo_id="sberbank-ai/SignFlow",
            filename="model.pt",
            cache_dir="./.cache/signflow",
        )
        state = torch.load(model_path, map_location="cpu")
        _model = SignFlowModel(num_classes=1000)
        _model.load_state_dict(state, strict=False)
        logger.info("Веса SignFlow загружены с Hugging Face.")
    except Exception as e:
        logger.warning(f"Не удалось загрузить веса с HF: {e}")
        logger.info("Создаю эмулятор модели (демо-режим).")
        _model = SignFlowModel(num_classes=1000)

    # ── Оптимизация для CPU ─────────────────────────────────────────
    _model.eval()
    if TORCH_AVAILABLE:
        try:
            _model = torch.quantization.quantize_dynamic(
                _model, {nn.Linear, nn.Conv2d}, dtype=torch.qint8
            )
            logger.info("Модель оптимизирована через torch.quantization (int8).")
        except Exception as e:
            logger.warning(f"Quantization не удалась: {e}")

    _model.eval()
    logger.info("SignFlow готова к инференсу.")
    return _model


def set_labels(labels: list):
    """Устанавливает список названий жестов (из gestures_db)."""
    global _labels
    _labels = labels


if TORCH_AVAILABLE:

    def preprocess_frame(frame_b64: str) -> Optional[torch.Tensor]:
        try:
            img_bytes = base64.b64decode(frame_b64)
            img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            tensor = _get_transform()(img).unsqueeze(0)
            return tensor
        except Exception as e:
            logger.warning(f"Ошибка обработки фрейма: {e}")
            return None

    @torch.no_grad()
    def recognize(frame_b64: str, top_k: int = 3) -> dict:
        t0 = time.perf_counter()
        model = load_model()
        tensor = preprocess_frame(frame_b64)
        if tensor is None:
            return {"gesture": "", "confidence": 0.0, "top_k": [], "time_ms": 0}
        logits = model(tensor)
        probs = F.softmax(logits, dim=1)
        top_probs, top_indices = torch.topk(probs, top_k, dim=1)
        top_results = []
        for i in range(top_k):
            idx = int(top_indices[0, i].item())
            label = _labels[idx] if idx < len(_labels) else f"gesture_{idx}"
            top_results.append({
                "id": idx,
                "gesture": label,
                "confidence": round(float(top_probs[0, i].item()), 4),
            })
        best = top_results[0]
        elapsed = round((time.perf_counter() - t0) * 1000, 1)
        return {"gesture": best["gesture"], "confidence": best["confidence"], "top_k": top_results, "time_ms": elapsed}

    def recognize_batch(frames_b64: list) -> dict:
        if not frames_b64:
            return {"gesture": "", "confidence": 0.0, "top_k": [], "time_ms": 0}
        model = load_model()
        tensors = []
        for f in frames_b64:
            t = preprocess_frame(f)
            if t is not None:
                tensors.append(t)
        if not tensors:
            return {"gesture": "", "confidence": 0.0, "top_k": [], "time_ms": 0}
        batch = torch.cat(tensors, dim=0)
        t0 = time.perf_counter()
        logits = model(batch)
        probs = F.softmax(logits, dim=1).mean(dim=0, keepdim=True)
        top_probs, top_indices = torch.topk(probs, 3, dim=1)
        top_results = []
        for i in range(3):
            idx = int(top_indices[0, i].item())
            label = _labels[idx] if idx < len(_labels) else f"gesture_{idx}"
            top_results.append({
                "id": idx,
                "gesture": label,
                "confidence": round(float(top_probs[0, i].item()), 4),
            })
        best = top_results[0]
        elapsed = round((time.perf_counter() - t0) * 1000, 1)
        return {"gesture": best["gesture"], "confidence": best["confidence"], "top_k": top_results, "time_ms": elapsed}
else:
    def preprocess_frame(frame_b64: str):
        return None

    def recognize(frame_b64: str, top_k: int = 3) -> dict:
        return {"gesture": "", "confidence": 0.0, "top_k": [], "time_ms": 0}

    def recognize_batch(frames_b64: list) -> dict:
        return {"gesture": "", "confidence": 0.0, "top_k": [], "time_ms": 0}
