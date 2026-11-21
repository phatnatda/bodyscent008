/* ==========================================================
   Body Scent — script.js (ใช้ร่วมกันทุกหน้า)
   - product.html : #filter-bar, #product-list
   - order.html   : #orderForm, #customerName, #contact, #items, #total, #note
   - admin.html   : #ordersTable tbody
   ========================================================== */

(function () {
  'use strict';

  /* ---------- Config ---------- */
  var APPS_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbxcdVQGhJ_Nms9Kq0bdeOws4zBLZ2wptXCmuQcryNNdGrG8ALZMCt88UQy2Tb3SSx0S3Q/exec';

  var SHEET_CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vQdCjEopMgbD-izRJHaTW18OHoQ5y-wzf5i4Xa4lmGPQOlXD7DvD7l_EkX5cLkXI9s2JKWogHiU66XU/pub?gid=0&single=true&output=csv';

  var MOODS = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'fresh', label: 'Fresh' },
    { key: 'sweet', label: 'Sweet' },
    { key: 'confident', label: 'Confident' },
    { key: 'romance', label: 'Romance' }
  ];

  var MOOD_LABEL = {
    fresh: 'Fresh',
    sweet: 'Sweet',
    confident: 'Confident',
    romance: 'Romance'
  };

  /* ---------- Helpers ---------- */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function formatPrice(n) {
    return Number(n).toLocaleString('th-TH') + ' บาท';
  }

  /* ==========================================================
     1) product.html
     ========================================================== */
  function initProductPage() {
    var filterBar = document.getElementById('filter-bar');
    var list = document.getElementById('product-list');
    if (!filterBar || !list) return;

    var products = [];
    var currentMood = 'all';

    function isValidMood(m) {
      return MOODS.some(function (x) { return x.key === m; });
    }

    function renderFilter() {
      filterBar.innerHTML = '';
      MOODS.forEach(function (m) {
        var btn = el('button', m.key === currentMood ? 'is-active' : '', m.label);
        btn.type = 'button';
        btn.setAttribute('data-mood', m.key);
        btn.setAttribute('aria-pressed', m.key === currentMood ? 'true' : 'false');
        btn.addEventListener('click', function () {
          currentMood = m.key;
          syncUrl();
          renderFilter();
          renderProducts();
        });
        filterBar.appendChild(btn);
      });
    }

    function syncUrl() {
      if (!window.history || !history.replaceState) return;
      var url = new URL(window.location.href);
      if (currentMood === 'all') {
        url.searchParams.delete('mood');
      } else {
        url.searchParams.set('mood', currentMood);
      }
      history.replaceState(null, '', url.toString());
    }

    function buildOrderUrl(p) {
      var itemName = p.size ? p.name + ' ' + p.size : p.name;
      return (
        'order.html?item=' + encodeURIComponent(itemName) +
        '&price=' + encodeURIComponent(p.price)
      );
    }

    function buildCard(p) {
      var card = el('article', 'product-card');
      card.setAttribute('data-mood', p.mood);

      var media = el('div', 'product-card__media');
      var img = document.createElement('img');
      img.src = p.image;
      img.alt = p.name;
      img.loading = 'lazy';
      media.appendChild(img);

      var body = el('div', 'product-card__body');

      var mood = el('div', 'product-card__mood');
      mood.appendChild(el('span', 'mood-dot'));
      mood.appendChild(document.createTextNode(MOOD_LABEL[p.mood] || p.mood));

      var name = el('h3', 'product-card__name', p.name);
      var metaParts = [];
      if (p.size) metaParts.push(p.size);
      var meta = el('div', 'product-card__meta', metaParts.join(' '));

      var foot = el('div', 'product-card__foot');
      foot.appendChild(el('span', 'price', formatPrice(p.price)));
      var buy = el('a', 'btn btn--gold', 'สั่งซื้อ');
      buy.href = buildOrderUrl(p);
      foot.appendChild(buy);

      body.appendChild(mood);
      body.appendChild(name);
      if (metaParts.length) body.appendChild(meta);
      body.appendChild(foot);

      card.appendChild(media);
      card.appendChild(body);
      return card;
    }

    function renderProducts() {
      list.innerHTML = '';
      list.classList.add('product-grid');

      var shown = products.filter(function (p) {
        return currentMood === 'all' || p.mood === currentMood;
      });

      if (!shown.length) {
        list.appendChild(el('p', '', 'ไม่พบสินค้าในหมวดนี้'));
        return;
      }
      shown.forEach(function (p) { list.appendChild(buildCard(p)); });
    }

    var params = new URLSearchParams(window.location.search);
    var urlMood = (params.get('mood') || '').toLowerCase();
    if (isValidMood(urlMood)) currentMood = urlMood;

    renderFilter();

    fetch('products.json')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        products = data;
        renderProducts();
      })
      .catch(function (err) {
        console.error(err);
        list.innerHTML = '';
        list.appendChild(el('p', '', 'โหลดข้อมูลสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'));
      });
  }

  /* ==========================================================
     2) order.html
     ========================================================== */
  function initOrderPage() {
    var form = document.getElementById('orderForm');
    if (!form) return;

    var itemsInput = document.getElementById('items');
    var totalInput = document.getElementById('total');

    // เติมข้อมูลจาก URL parameter ทันทีที่โหลดหน้า (ทั้ง items และ total)
    var params = new URLSearchParams(window.location.search);
    var item = params.get('item');
    var price = params.get('price');

    if (itemsInput && item) itemsInput.value = item;
    if (totalInput && price) totalInput.value = price;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      var payload = {
        customerName: document.getElementById('customerName').value,
        contact: document.getElementById('contact').value,
        items: document.getElementById('items').value,
        total: document.getElementById('total').value,
        note: document.getElementById('note').value
      };

      fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
        .then(() => { window.location.href = 'thankyou.html'; })
        .catch(error => {
          console.error(error);
          alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  /* ==========================================================
     3) admin.html
     ========================================================== */

  // parse CSV เอง: รองรับ "ข้อความในเครื่องหมายคำพูด", comma และขึ้นบรรทัดใหม่ในช่อง, "" แทน "
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;

    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // ตัด BOM

    for (var i = 0; i < text.length; i++) {
      var c = text[i];

      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else { inQuotes = false; }
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field); field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        rows.push(row); row = [];
      } else {
        field += c;
      }
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }

    return rows.filter(function (r) {
      return r.some(function (cell) { return cell.trim() !== ''; });
    });
  }

  function initAdminPage() {
    var tbody = document.querySelector('#ordersTable tbody');
    if (!tbody) return;

    function showMessage(msg) {
      tbody.innerHTML = '';
      var tr = document.createElement('tr');
      var td = el('td', '', msg);
      td.colSpan = 6;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    showMessage('กำลังโหลดข้อมูล...');

    // ป้องกัน cache ของ Google Sheets
    var url = SHEET_CSV_URL + '&_=' + Date.now();

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        var rows = parseCSV(text);
        rows.shift(); // ตัดแถวหัวตาราง

        if (!rows.length) { showMessage('ยังไม่มีรายการสั่งซื้อ'); return; }

        // ชีตเพิ่มแถวใหม่ต่อท้าย → กลับลำดับให้รายการล่าสุดขึ้นก่อน
        rows.reverse();

        tbody.innerHTML = '';
        rows.forEach(function (r) {
          var tr = document.createElement('tr');
          // คอลัมน์: วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ
          for (var i = 0; i < 6; i++) {
            // ใช้ textContent เสมอ เพราะข้อมูลมาจากลูกค้า (กัน HTML/script แทรก)
            tr.appendChild(el('td', '', r[i] !== undefined ? r[i] : ''));
          }
          tbody.appendChild(tr);
        });
      })
      .catch(function (err) {
        console.error(err);
        showMessage('โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      });
  }

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    initProductPage();
    initOrderPage();
    initAdminPage();
  });
})();
