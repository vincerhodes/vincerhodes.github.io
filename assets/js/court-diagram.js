// Right Court SC — static SVG court template + renderCourtDiagram() (Phase 3: diagram system).
// See planning/06-SVG-DIAGRAM-SYSTEM.md for the full spec this implements.
//
// Usage: renderCourtDiagram(containerEl, diagramData) where diagramData matches the schema in
// 06-SVG-DIAGRAM-SYSTEM.md / 05-AI-DRILL-BUILDER-PROMPT.md ({ title, players[], arrows[] }).
// No external dependencies — plain DOM/SVG APIs only, per 03-TECHNICAL-ARCHITECTURE.md (no build step).
(function () {
  var SVG_NS = 'http://www.w3.org/2000/svg';

  // viewBox ratio matches a real court's ~6.4m x 9.75m proportions (see 06-SVG-DIAGRAM-SYSTEM.md).
  var COURT_WIDTH = 100;
  var COURT_LENGTH = 150;

  // Brand colors — see 01-BRAND-STYLE-GUIDE.md.
  var LINE_COLOR = '#21472E'; // Forest Green
  var TEXT_COLOR = '#152218'; // Near-black Green
  var WHITE = '#FFFFFF';

  var diagramCounter = 0;

  function svgEl(name, attrs) {
    var node = document.createElementNS(SVG_NS, name);
    if (attrs) {
      for (var key in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, key)) {
          node.setAttribute(key, attrs[key]);
        }
      }
    }
    return node;
  }

  function buildCourtTemplate(svg) {
    // Outer court boundary.
    svg.appendChild(svgEl('rect', {
      x: 0, y: 0, width: COURT_WIDTH, height: COURT_LENGTH,
      fill: WHITE, stroke: LINE_COLOR, 'stroke-width': 0.6,
    }));

    // Front wall — heavier stroke (3x the other lines) along the top edge (y=0), per spec.
    svg.appendChild(svgEl('line', {
      x1: 0, y1: 0, x2: COURT_WIDTH, y2: 0,
      stroke: LINE_COLOR, 'stroke-width': 1.8, 'stroke-linecap': 'square',
    }));

    var frontLabel = svgEl('text', {
      x: COURT_WIDTH / 2, y: -3.5, 'text-anchor': 'middle',
      'font-size': 3.4, fill: TEXT_COLOR, 'letter-spacing': '0.2em',
      'font-family': 'system-ui, sans-serif', class: 'front-wall-label',
    });
    frontLabel.textContent = 'FRONT WALL';
    svg.appendChild(frontLabel);

    // Short line.
    var shortLineY = COURT_LENGTH * 0.56;
    svg.appendChild(svgEl('line', {
      x1: 0, y1: shortLineY, x2: COURT_WIDTH, y2: shortLineY,
      stroke: LINE_COLOR, 'stroke-width': 0.6,
    }));

    // Half-court line, from the short line to the back wall.
    svg.appendChild(svgEl('line', {
      x1: COURT_WIDTH / 2, y1: shortLineY, x2: COURT_WIDTH / 2, y2: COURT_LENGTH,
      stroke: LINE_COLOR, 'stroke-width': 0.6,
    }));

    // Both service boxes.
    var boxSize = COURT_WIDTH * 0.24;
    [0, COURT_WIDTH - boxSize].forEach(function (bx) {
      svg.appendChild(svgEl('rect', {
        x: bx, y: shortLineY, width: boxSize, height: boxSize,
        fill: 'none', stroke: LINE_COLOR, 'stroke-width': 0.6,
      }));
    });
  }

  function buildArrowMarkers(svg, idPrefix) {
    var defs = svgEl('defs');
    ['ball', 'movement'].forEach(function (type) {
      var marker = svgEl('marker', {
        id: idPrefix + '-arrowhead-' + type,
        viewBox: '0 0 10 10', refX: 8, refY: 5,
        markerWidth: 4.5, markerHeight: 4.5, orient: 'auto-start-reverse',
      });
      marker.appendChild(svgEl('path', { d: 'M0,0 L10,5 L0,10 z', fill: LINE_COLOR }));
      defs.appendChild(marker);
    });
    svg.appendChild(defs);
  }

  function drawArrows(svg, arrows, idPrefix) {
    (arrows || []).forEach(function (arrow) {
      var points = (arrow.points || []).map(function (pt) {
        return [pt[0] * COURT_WIDTH, pt[1] * COURT_LENGTH];
      });
      if (points.length < 2) return;

      // Straight line segments, in array order — no curve-fitting or smoothing (per spec).
      var d = points
        .map(function (pt, i) {
          return (i === 0 ? 'M' : 'L') + pt[0].toFixed(2) + ',' + pt[1].toFixed(2);
        })
        .join(' ');

      var isMovement = arrow.type === 'movement';
      svg.appendChild(svgEl('path', {
        d: d,
        fill: 'none',
        stroke: LINE_COLOR,
        'stroke-width': 0.7,
        'stroke-dasharray': isMovement ? '2.2,1.6' : 'none',
        'marker-end': 'url(#' + idPrefix + '-arrowhead-' + arrow.type + ')',
        class: 'arrow arrow-' + arrow.type,
      }));

      // Numbered circle at the arrow's overall midpoint: the midpoint of the middle segment, or
      // the single segment's midpoint for a 2-point arrow (per 06-SVG-DIAGRAM-SYSTEM.md).
      var segmentCount = points.length - 1;
      var midSegmentIndex = Math.floor((segmentCount - 1) / 2);
      var a = points[midSegmentIndex];
      var b = points[midSegmentIndex + 1];
      var midX = (a[0] + b[0]) / 2;
      var midY = (a[1] + b[1]) / 2;

      var numberGroup = svgEl('g', { class: 'arrow-number' });
      numberGroup.appendChild(svgEl('circle', {
        cx: midX, cy: midY, r: 2.8, fill: WHITE, stroke: LINE_COLOR, 'stroke-width': 0.5,
      }));
      var numberText = svgEl('text', {
        x: midX, y: midY + 1, 'text-anchor': 'middle', 'font-size': 2.8,
        fill: LINE_COLOR, 'font-weight': 'bold', 'font-family': 'system-ui, sans-serif',
      });
      numberText.textContent = String(arrow.number);
      numberGroup.appendChild(numberText);
      svg.appendChild(numberGroup);
    });
  }

  function drawPlayers(svg, players) {
    (players || []).forEach(function (p) {
      var cx = p.x * COURT_WIDTH;
      var cy = p.y * COURT_LENGTH;

      var caption = svgEl('text', {
        x: cx, y: cy - 4.5, 'text-anchor': 'middle', 'font-size': 2.8,
        fill: TEXT_COLOR, 'font-family': 'system-ui, sans-serif',
      });
      caption.textContent = p.label || '';
      svg.appendChild(caption);

      var marker = svgEl('g', { class: 'player' });
      marker.appendChild(svgEl('circle', {
        cx: cx, cy: cy, r: 3.6, fill: p.color, stroke: WHITE, 'stroke-width': 0.5,
      }));
      var idText = svgEl('text', {
        x: cx, y: cy + 1.1, 'text-anchor': 'middle', 'font-size': 3.2,
        fill: WHITE, 'font-weight': 'bold', 'font-family': 'system-ui, sans-serif',
      });
      idText.textContent = p.id || '';
      marker.appendChild(idText);
      svg.appendChild(marker);
    });
  }

  /**
   * Renders a single court diagram into containerEl.
   * @param {Element} containerEl
   * @param {{title:string, players:Array, arrows:Array}} data
   * @returns {Element|null} the <figure> wrapper that was appended, or null if inputs are invalid.
   */
  function renderCourtDiagram(containerEl, data) {
    if (!containerEl || !data) return null;

    diagramCounter += 1;
    var idPrefix = 'court-diagram-' + diagramCounter;

    var wrapper = document.createElement('figure');
    wrapper.className = 'court-diagram-figure';

    var svg = svgEl('svg', {
      class: 'court-diagram',
      viewBox: '-8 -12 ' + (COURT_WIDTH + 16) + ' ' + (COURT_LENGTH + 18),
      role: 'img',
      'aria-label': data.title || 'Squash court diagram',
    });

    buildArrowMarkers(svg, idPrefix);
    buildCourtTemplate(svg);
    drawArrows(svg, data.arrows, idPrefix);
    drawPlayers(svg, data.players);

    wrapper.appendChild(svg);

    if (data.title) {
      var figcaption = document.createElement('figcaption');
      figcaption.className = 'court-diagram-caption';
      figcaption.textContent = data.title;
      wrapper.appendChild(figcaption);
    }

    containerEl.appendChild(wrapper);
    return wrapper;
  }

  window.renderCourtDiagram = renderCourtDiagram;
})();
