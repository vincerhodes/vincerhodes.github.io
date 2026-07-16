// Right Court SC — AI Drill Builder form logic, shared between /drill-builder/ (standalone page) and
// /drills/ (embedded section). Requires a host page with the exact DOM ids/classes from
// drill-builder/index.html's form + result markup, plus court-diagram.js loaded first.
(function () {
  'use strict';

  // Production default; a dev/test harness (see tests/e2e/drill-builder.spec.ts) overrides this
  // via window.DRILL_BUILDER_API_BASE before this script runs (an addInitScript, i.e. before
  // navigation), so no production code branches on hostname/environment here.
  var API_BASE = window.DRILL_BUILDER_API_BASE || 'https://api.rightcourtsc.com';

  var form = document.getElementById('builder-form');
  if (!form) return; // Host page doesn't include the builder markup — nothing to wire up.

  var submitBtn = document.getElementById('builder-submit');
  var statusEl = document.getElementById('builder-status');
  var resultEl = document.getElementById('plan-result');
  var planEl = document.getElementById('plan-markdown');
  var diagramsEl = document.getElementById('plan-diagrams');
  var saveButtonsEl = document.getElementById('save-plan-buttons');

  var lastPlan = null; // { plan_markdown, drills } — for the Save flow.

  // Squash-ball loading spinner — near-black-green ball, sage shadow, two yellow speed dots
  // (a nod to real squash ball speed-grade dot markings, and the site's one deliberate spot of
  // color). Shown only while a generation request is in flight.
  var BALL_SPINNER_SVG =
    '<svg class="ball-spinner-svg" width="40" height="40" viewBox="0 0 60 60" aria-hidden="true">' +
    '<ellipse class="ball-spinner-shadow" cx="30" cy="50" rx="14" ry="4"></ellipse>' +
    '<g class="ball-spinner-arc">' +
    '<g class="ball-spinner-ball">' +
    '<circle class="ball-spinner-body" cx="30" cy="30" r="15"></circle>' +
    '<path class="ball-spinner-seam" d="M17,22 Q30,32 17,42"></path>' +
    '<path class="ball-spinner-seam" d="M43,22 Q30,32 43,42"></path>' +
    '<circle class="ball-spinner-dot" cx="24" cy="24" r="1.7"></circle>' +
    '<circle class="ball-spinner-dot" cx="36" cy="30" r="1.7"></circle>' +
    '</g>' +
    '</g>' +
    '</svg>';

  // --- Minimal Markdown -> HTML renderer -------------------------------------------------
  // No external dependencies (per 03-TECHNICAL-ARCHITECTURE.md's "plain HTML/CSS/JS, no build
  // step"). Covers exactly what the return_session_plan system prompt's OUTPUT FORMAT asks the
  // model to produce: headings, a timeline table, paragraphs, bullet lists, bold text.
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderInline(s) {
    return escapeHtml(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  }

  function renderMarkdown(markdown) {
    var lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
    var html = [];
    var i = 0;
    var listOpen = false;

    function closeList() {
      if (listOpen) {
        html.push('</ul>');
        listOpen = false;
      }
    }

    while (i < lines.length) {
      var line = lines[i];

      var heading = /^(#{1,6})\s+(.*)$/.exec(line);
      if (heading) {
        closeList();
        var level = heading[1].length;
        html.push('<h' + level + '>' + renderInline(heading[2].trim()) + '</h' + level + '>');
        i += 1;
        continue;
      }

      if (/^\s*\|.*\|\s*$/.test(line)) {
        closeList();
        var tableLines = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          tableLines.push(lines[i]);
          i += 1;
        }
        html.push(renderTable(tableLines));
        continue;
      }

      if (/^\s*[-*]\s+/.test(line)) {
        if (!listOpen) {
          html.push('<ul>');
          listOpen = true;
        }
        html.push('<li>' + renderInline(line.replace(/^\s*[-*]\s+/, '')) + '</li>');
        i += 1;
        continue;
      }

      closeList();

      if (line.trim() === '') {
        i += 1;
        continue;
      }

      // Paragraph: collect contiguous non-blank, non-special lines.
      var paraLines = [];
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !/^(#{1,6})\s+/.test(lines[i]) &&
        !/^\s*\|.*\|\s*$/.test(lines[i]) &&
        !/^\s*[-*]\s+/.test(lines[i])
      ) {
        paraLines.push(lines[i]);
        i += 1;
      }
      html.push('<p>' + renderInline(paraLines.join(' ')) + '</p>');
    }

    closeList();
    return html.join('\n');
  }

  function renderTable(tableLines) {
    var rows = tableLines
      .map(function (l) {
        return l
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map(function (c) { return c.trim(); });
      })
      .filter(function (cells) {
        // Drop a markdown separator row, e.g. | --- | --- |
        return !cells.every(function (c) { return /^:?-{2,}:?$/.test(c); });
      });

    if (rows.length === 0) return '';

    var head = rows[0];
    var body = rows.slice(1);

    var out = ['<table>', '<thead><tr>'];
    head.forEach(function (c) { out.push('<th scope="col">' + renderInline(c) + '</th>'); });
    out.push('</tr></thead>', '<tbody>');
    body.forEach(function (r) {
      out.push('<tr>');
      r.forEach(function (c) { out.push('<td>' + renderInline(c) + '</td>'); });
      out.push('</tr>');
    });
    out.push('</tbody>', '</table>');
    return out.join('');
  }

  // --- Status / result rendering ----------------------------------------------------------
  function setStatus(message, state) {
    if (state === 'loading') {
      statusEl.innerHTML = BALL_SPINNER_SVG + '<span>' + escapeHtml(message || '') + '</span>';
    } else {
      statusEl.textContent = message || '';
    }
    statusEl.hidden = !message;
    if (state) {
      statusEl.setAttribute('data-state', state);
    } else {
      statusEl.removeAttribute('data-state');
    }
  }

  function renderResult(data) {
    lastPlan = data;
    planEl.innerHTML = renderMarkdown(data.plan_markdown);
    diagramsEl.innerHTML = '';

    (data.drills || []).forEach(function (drill, index) {
      var slot = document.createElement('div');
      slot.className = 'drill-diagram-slot';
      slot.setAttribute('data-drill-index', String(index));

      if (drill.diagram) {
        renderCourtDiagram(slot, drill.diagram);
      } else {
        // Graceful degrade per 06-SVG-DIAGRAM-SYSTEM.md "Validation" — render the drill's text
        // (already in plan_markdown above) without its diagram, no error to the user.
        var note = document.createElement('p');
        note.className = 'diagram-unavailable';
        note.textContent =
          'Diagram unavailable for "' + (drill.drill_name || 'this drill') + '" — the plan text above is unaffected.';
        slot.appendChild(note);
      }
      diagramsEl.appendChild(slot);
    });

    resultEl.hidden = false;
    renderSaveButtons(data);
  }

  // --- Save to library (client-side packaging only, no extra Worker call) ----------------
  function slugify(s) {
    return String(s)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function downloadTextFile(filename, contents) {
    var blob = new Blob([contents], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function renderSaveButtons(data) {
    saveButtonsEl.innerHTML = '';

    var themeValue = form.elements.theme.value;
    var levelValue = form.elements.level.value;
    var slug = 'session-XX-' + slugify(themeValue || 'session');
    var today = new Date().toISOString().slice(0, 10);

    var frontMatter =
      '---\n' +
      'theme: ' + themeValue + '\n' +
      'level: ' + levelValue + '\n' +
      'date: ' + today + '\n' +
      'tags: [' + themeValue + ']\n' +
      'title: ' + slug + '\n' +
      '---\n\n';

    var sessionBtn = document.createElement('button');
    sessionBtn.type = 'button';
    sessionBtn.textContent = 'Download session.md';
    sessionBtn.addEventListener('click', function () {
      downloadTextFile('session.md', frontMatter + data.plan_markdown);
    });
    saveButtonsEl.appendChild(sessionBtn);

    (data.drills || []).forEach(function (drill, index) {
      if (!drill.diagram) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Download diagrams/drill-' + (index + 1) + '.json';
      btn.addEventListener('click', function () {
        downloadTextFile('drill-' + (index + 1) + '.json', JSON.stringify(drill.diagram, null, 2));
      });
      saveButtonsEl.appendChild(btn);
    });
  }

  // --- Form submit -------------------------------------------------------------------------
  function readFormPayload() {
    var formData = new FormData(form);
    var theme = String(formData.get('theme') || '');
    return {
      players: parseInt(formData.get('players'), 10),
      courts: parseInt(formData.get('courts'), 10),
      theme: theme,
      level: String(formData.get('level') || ''),
      duration_minutes: parseInt(formData.get('duration_minutes'), 10),
      notes: String(formData.get('notes') || '').trim(),
    };
  }

  function generate() {
    var payload = readFormPayload();

    submitBtn.disabled = true;
    resultEl.hidden = true;
    setStatus('Generating your session plan… complex plans can take a little while.', 'loading');

    fetch(API_BASE + '/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (response) {
        return response.json().then(function (body) {
          if (!response.ok) {
            throw new Error((body && body.error) || 'Generation failed');
          }
          return body;
        });
      })
      .then(function (data) {
        setStatus('');
        renderResult(data);
      })
      .catch(function (err) {
        // Error contract per 03-TECHNICAL-ARCHITECTURE.md: on total failure, show a plain
        // message with a retry button — never a stack trace or raw error to the user. The real
        // error still goes to the console so a report of "it failed" is diagnosable.
        if (window.console && console.error) {
          console.error('Drill builder generation failed:', err);
        }
        statusEl.innerHTML = '';
        statusEl.setAttribute('data-state', 'error');
        statusEl.hidden = false;
        statusEl.append("Couldn't generate a plan — try again.");
        var retryBtn = document.createElement('button');
        retryBtn.type = 'button';
        retryBtn.className = 'builder-retry';
        retryBtn.textContent = 'Retry';
        retryBtn.addEventListener('click', generate);
        statusEl.appendChild(retryBtn);
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    generate();
  });
})();
