// Simple Chart Drawing using Canvas API
const Charts = {
  // رسم خط بياني
  drawLineChart(canvasId, data, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 70 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Clear
    ctx.clearRect(0, 0, width, height);

    if (!data || data.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Cairo';
      ctx.textAlign = 'center';
      ctx.fillText('لا توجد بيانات', width / 2, height / 2);
      return;
    }

    const values = data.map(d => d.value);
    const maxVal = Math.max(...values, 1);
    const minVal = 0;

    // Grid lines
    const gridLines = 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Cairo';
    ctx.textAlign = 'left';

    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartH / gridLines) * i;
      const val = maxVal - (maxVal / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(Format.number(Math.round(val)), 5, y + 4);
    }

    // Draw line
    const points = data.map((d, i) => ({
      x: padding.left + (chartW / (data.length - 1 || 1)) * i,
      y: padding.top + chartH - (d.value / maxVal) * chartH,
      label: d.label
    }));

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    const color = options.color || '#3b82f6';
    gradient.addColorStop(0, color + '30');
    gradient.addColorStop(1, color + '00');

    ctx.beginPath();
    ctx.moveTo(points[0].x, height - padding.bottom);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // Points
    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0e1a';
      ctx.fill();
    });

    // Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px Cairo';
    ctx.textAlign = 'center';
    points.forEach(p => {
      ctx.fillText(p.label, p.x, height - 10);
    });
  },

  // رسم دائري
  drawPieChart(canvasId, data, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    if (!data || data.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Cairo';
      ctx.textAlign = 'center';
      ctx.fillText('لا توجد بيانات', width / 2, height / 2);
      return;
    }

    const colors = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const centerX = width * 0.4;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    let startAngle = -Math.PI / 2;

    data.forEach((d, i) => {
      const sliceAngle = (d.value / total) * Math.PI * 2;
      const color = colors[i % colors.length];

      // Draw slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      // Gap between slices
      ctx.strokeStyle = '#0a0e1a';
      ctx.lineWidth = 2;
      ctx.stroke();

      startAngle += sliceAngle;
    });

    // Center hole (donut)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#111827';
    ctx.fill();

    // Total in center
    ctx.fillStyle = '#f0f4f8';
    ctx.font = 'bold 16px Cairo';
    ctx.textAlign = 'center';
    ctx.fillText(Format.number(total), centerX, centerY - 4);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px Cairo';
    ctx.fillText('إجمالي', centerX, centerY + 14);

    // Legend
    const legendX = width * 0.7;
    let legendY = 30;

    data.forEach((d, i) => {
      const color = colors[i % colors.length];
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(legendX, legendY - 6, 12, 12, 3);
      ctx.fill();

      ctx.fillStyle = '#f0f4f8';
      ctx.font = '11px Cairo';
      ctx.textAlign = 'right';
      ctx.fillText(d.label, legendX + 20, legendY + 4);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Cairo';
      ctx.fillText(`(${Math.round(d.value / total * 100)}%)`, legendX + 22 + ctx.measureText(d.label).width + 8, legendY + 4);

      legendY += 28;
    });
  },

  // رسم أعمدة
  drawBarChart(canvasId, data, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 70 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    if (!data || data.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Cairo';
      ctx.textAlign = 'center';
      ctx.fillText('لا توجد بيانات', width / 2, height / 2);
      return;
    }

    const maxVal = Math.max(...data.map(d => d.value), 1);
    const barWidth = Math.min(40, (chartW / data.length) * 0.6);
    const gap = (chartW - barWidth * data.length) / (data.length + 1);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Cairo';
    ctx.textAlign = 'left';

    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartH / 5) * i;
      const val = maxVal - (maxVal / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(Format.number(Math.round(val)), 5, y + 4);
    }

    // Bars
    const color = options.color || '#3b82f6';
    data.forEach((d, i) => {
      const x = padding.left + gap + (barWidth + gap) * i;
      const barH = (d.value / maxVal) * chartH;
      const y = padding.top + chartH - barH;

      // Bar gradient
      const grad = ctx.createLinearGradient(x, y, x, padding.top + chartH);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color + '40');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
      ctx.fill();

      // Label
      ctx.fillStyle = '#64748b';
      ctx.font = '10px Cairo';
      ctx.textAlign = 'center';
      ctx.fillText(d.label, x + barWidth / 2, height - 10);
    });
  }
};
