/**
 * Логика сравнения жестов.
 *
 * Сравнивает 21 точку, полученную от MediaPipe Hands,
 * с эталонными точками из gestureReferenceData.js.
 *
 * Возвращает 4 метрики точности:
 *   total    — общий процент (0–100)
 *   shape    — форма руки (углы между фалангами)
 *   position — позиция в кадре (x, y, z)
 *   movement — направление движения (если отслеживается)
 */

// Толерантность для каждой метрики (0..1)
const TOLERANCE = { shape: 0.18, position: 0.15, movement: 0.20 };

// Веса для общего счёта
const WEIGHTS = { shape: 0.45, position: 0.30, movement: 0.25 };

// Порог зачёта
const PASS_THRESHOLD = 80;

/**
 * Вычислить евклидово расстояние между двумя точками [x, y, z]
 */
function dist(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = (a[2] || 0) - (b[2] || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Вычислить угол между двумя векторами (в радианах)
 */
function angle(v1, v2) {
  const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
  const m1 = Math.sqrt(v1[0] ** 2 + v1[1] ** 2 + v1[2] ** 2);
  const m2 = Math.sqrt(v2[0] ** 2 + v2[1] ** 2 + v2[2] ** 2);
  if (m1 < 0.001 || m2 < 0.001) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2))));
}

/**
 * Вычесть одну точку из другой → вектор
 */
function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], (a[2] || 0) - (b[2] || 0)];
}

/**
 * Нормализовать массив точек относительно запястья (индекс 0)
 * и размера кисти (расстояние от запястья до MCP среднего пальца).
 * Это делает сравнение инвариантным к положению руки в кадре.
 */
function normalizeLandmarks(landmarks) {
  const wrist = landmarks[0];
  const midMcp = landmarks[9];
  if (!wrist || !midMcp) return landmarks;

  const scale = dist(wrist, midMcp) || 1;

  return landmarks.map(p => [
    (p[0] - wrist[0]) / scale,
    (p[1] - wrist[1]) / scale,
    ((p[2] || 0) - (wrist[2] || 0)) / scale,
  ]);
}

/**
 * Сравнение формы руки.
 * Считает углы между фалангами для каждого пальца и сравнивает с эталоном.
 */
function compareShape(detected, reference) {
  const fingerDefs = [
    { mcp: 1, pip: 2, tip: 4 },   // большой
    { mcp: 5, pip: 6, tip: 8 },   // указательный
    { mcp: 9, pip: 10, tip: 12 }, // средний
    { mcp: 13, pip: 14, tip: 16 },// безымянный
    { mcp: 17, pip: 18, tip: 20 },// мизинец
  ];

  let totalScore = 0;
  let count = 0;

  const normDet = normalizeLandmarks(detected);
  const normRef = normalizeLandmarks(reference);

  for (const { mcp, pip, tip } of fingerDefs) {
    // Угол MCP → PIP
    const v1Det = sub(normDet[pip], normDet[mcp]);
    const v1Ref = sub(normRef[pip], normRef[mcp]);
    const a1 = Math.abs(angle(v1Det, v1Ref));
    totalScore += Math.max(0, 1 - a1 / Math.PI);
    count++;

    // Угол PIP → TIP
    const v2Det = sub(normDet[tip], normDet[pip]);
    const v2Ref = sub(normRef[tip], normRef[pip]);
    const a2 = Math.abs(angle(v2Det, v2Ref));
    totalScore += Math.max(0, 1 - a2 / Math.PI);
    count++;

    // Длина фаланги PIP → TIP (соотношение)
    const lenDet = dist(normDet[tip], normDet[pip]);
    const lenRef = dist(normRef[tip], normRef[pip]);
    const lenRatio = lenRef > 0 ? Math.min(lenDet / lenRef, lenRef / lenDet) : 0;
    totalScore += lenRatio;
    count++;
  }

  const raw = count > 0 ? totalScore / count : 0;
  return Math.round(Math.max(0, Math.min(100, (1 - (1 - raw) * 2) * 100)));
}

/**
 * Сравнение абсолютной позиции руки в кадре.
 */
function comparePosition(detected, reference) {
  // Используем нормализованные, но уже с учётом масштаба
  const normDet = normalizeLandmarks(detected);
  const normRef = normalizeLandmarks(reference);

  let totalDist = 0;
  for (let i = 0; i < 21; i++) {
    totalDist += dist(normDet[i] || [0, 0, 0], normRef[i] || [0, 0, 0]);
  }
  const avgDist = totalDist / 21;
  const score = Math.max(0, 1 - avgDist / TOLERANCE.position);
  return Math.round(score * 100);
}

/**
 * Сравнение движения (есть предыдущий кадр).
 * Сравнивает дельты точек между кадрами.
 */
function compareMovement(detected, reference, prevDetected, prevReference) {
  if (!prevDetected || !prevReference) return 0;

  let totalScore = 0;
  let count = 0;

  for (let i = 0; i < 21; i++) {
    const dDet = sub(detected[i] || [0, 0, 0], prevDetected[i] || [0, 0, 0]);
    const dRef = sub(reference[i] || [0, 0, 0], prevReference[i] || [0, 0, 0]);
    const dMag = dist(dDet, [0, 0, 0]);
    const rMag = dist(dRef, [0, 0, 0]);

    // Если нет движения в эталоне, пропускаем
    if (rMag < 0.001) { totalScore += 1; count++; continue; }

    // Сравниваем направление движения
    const cosAngle = dMag > 0 && rMag > 0
      ? (dDet[0] * dRef[0] + dDet[1] * dRef[1] + (dDet[2] || 0) * (dRef[2] || 0)) / (dMag * rMag)
      : 0;
    totalScore += Math.max(0, cosAngle);
    count++;
  }

  const raw = count > 0 ? totalScore / count : 0;
  return Math.round(raw * 100);
}

/**
 * Главная функция сравнения.
 *
 * @param {number[][]} detected  — 21 точка от MediaPipe
 * @param {object} gestureData   — данные жеста из GESTURE_REFERENCE
 * @param {object} [prev]        — { detected, reference } из предыдущего кадра
 * @returns {{ total, shape, position, movement, passed }}
 */
function evaluateGesture(detected, gestureData, prev = null) {
  if (!detected || detected.length < 21 || !gestureData) {
    return { total: 0, shape: 0, position: 0, movement: 0, passed: false };
  }

  const reference = gestureData.landmarks;
  if (!reference || reference.length < 21) {
    return { total: 0, shape: 0, position: 0, movement: 0, passed: false };
  }

  const shape = compareShape(detected, reference);
  const position = comparePosition(detected, reference);
  const movement = prev
    ? compareMovement(detected, reference, prev.detected, prev.reference)
    : 0;

  const total = Math.round(
    shape * WEIGHTS.shape + position * WEIGHTS.position + movement * WEIGHTS.movement
  );

  return {
    total,
    shape,
    position,
    movement,
    passed: total >= PASS_THRESHOLD,
  };
}

/**
 * Проверить дополнительные ограничения жеста (поворот ладони, касания и т.д.)
 */
function checkConstraints(detected, constraints) {
  if (!constraints || Object.keys(constraints).length === 0) return [];

  const issues = [];

  if (constraints.minWristY !== undefined && detected[0]) {
    if (detected[0][1] > constraints.minWristY) {
      issues.push('Поднимите запястье выше');
    }
  }

  if (constraints.maxHandWidth !== undefined) {
    const minX = Math.min(...detected.map(p => p[0]));
    const maxX = Math.max(...detected.map(p => p[0]));
    if (maxX - minX > constraints.maxHandWidth) {
      issues.push('Сожмите пальцы плотнее');
    }
  }

  if (constraints.thumbIndexTouch) {
    const thumbTip = detected[4];
    const indexTip = detected[8];
    if (thumbTip && indexTip && dist(thumbTip, indexTip) > 0.08) {
      issues.push('Соедините большой и указательный пальцы');
    }
  }

  if (constraints.otherFingersUp) {
    for (const idx of [12, 16, 20]) {
      if (detected[idx] && detected[0] && detected[idx][1] > detected[0][1]) {
        issues.push('Поднимите средний, безымянный пальцы и мизинец');
        break;
      }
    }
  }

  return issues;
}

export {
  evaluateGesture,
  checkConstraints,
  normalizeLandmarks,
  dist,
  PASS_THRESHOLD,
};
