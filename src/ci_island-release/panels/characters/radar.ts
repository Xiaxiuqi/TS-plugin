/**
 * 角色属性雷达图生成
 */

/**
 * 生成 SVG 雷达图
 * @param stats 属性数组（至少3项才能构成多边形）
 */
export function generateRadarChart(
  stats: { label: string; value: number; displayValue?: string }[],
): string {
  if (!stats || stats.length < 3) return '';

  const size = 200;
  const center = size / 2;
  const radius = size / 2 - 40;
  const levels = 4;

  const actualMax = Math.max(...stats.map(s => s.value));
  let maxVal = 50;
  if (actualMax > 50) {
    maxVal = Math.ceil(actualMax / 50) * 50;
  }

  const getCoord = (value: number, index: number, total: number) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const r = (value / maxVal) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  let gridHtml = '';
  for (let i = 1; i <= levels; i++) {
    const levelRadius = (radius / levels) * i;
    const points = stats
      .map((_, idx) => {
        const angle = (Math.PI * 2 * idx) / stats.length - Math.PI / 2;
        const x = center + levelRadius * Math.cos(angle);
        const y = center + levelRadius * Math.sin(angle);
        return `${x},${y}`;
      })
      .join(' ');
    gridHtml += `<polygon points="${points}" class="radar-grid" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>`;
  }

  const dataPoints = stats
    .map((s, i) => {
      const { x, y } = getCoord(s.value, i, stats.length);
      return `${x},${y}`;
    })
    .join(' ');

  let axesHtml = '';
  let labelsHtml = '';
  stats.forEach((s, i) => {
    const { x: x2, y: y2 } = getCoord(maxVal, i, stats.length);
    axesHtml += `<line x1="${center}" y1="${center}" x2="${x2}" y2="${y2}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`;

    const labelAngle = (Math.PI * 2 * i) / stats.length - Math.PI / 2;
    const labelRadius = radius + 20;
    const lx = center + labelRadius * Math.cos(labelAngle);
    const ly = center + labelRadius * Math.sin(labelAngle);

    let anchor = 'middle';
    if (Math.abs(lx - center) > 10) {
      anchor = lx > center ? 'start' : 'end';
    }

    const displayVal = s.displayValue !== undefined ? s.displayValue : s.value;
    labelsHtml += `<g class="radar-label-group" data-stat-name="${s.label}" style="cursor:pointer;"><text x="${lx}" y="${ly}" text-anchor="${anchor}" fill="rgba(255,255,255,0.8)" font-size="12" dy="-5">${s.label}</text><text x="${lx}" y="${ly}" text-anchor="${anchor}" fill="var(--smart-theme-color, #00e5ff)" font-size="10" dy="8">${displayVal}</text></g>`;
  });

  return `<div class="radar-chart-container"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="radar-chart-svg"><g class="radar-grids">${gridHtml}</g><g class="radar-axes">${axesHtml}</g><polygon points="${dataPoints}" fill="rgba(0, 229, 255, 0.3)" stroke="var(--smart-theme-color, #00e5ff)" stroke-width="2" class="radar-area"/><g class="radar-labels">${labelsHtml}</g></svg></div>`;
}
