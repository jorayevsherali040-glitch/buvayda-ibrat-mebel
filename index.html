<!doctype html>
<html lang="uz">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <title>BUVAYDA IBRAT MEBEL V24.2 — Hisob-kitob</title>
  <link rel="stylesheet" href="./hisob.css?v=24.2">
</head>
<body class="accounting-page">
  <main class="accounting-shell">
    <section class="accounting-login" id="accountingLogin">
      <img src="./logo.png" alt="Ibrat Mebel">
      <p>BUVAYDA IBRAT MEBEL</p>
      <h1>Hisob-kitob tizimi</h1>
      <form id="accountingLoginForm">
        <input id="accountingEmail" type="email" placeholder="Email" required>
        <input id="accountingPassword" type="password" placeholder="Parol" required>
        <button type="submit">Kirish</button>
      </form>
      <p id="accountingLoginMessage"></p>
    </section>

    <section id="accountingApp" hidden>
      <header class="accounting-header">
        <div>
          <p>BUVAYDA IBRAT MEBEL V24.2</p>
          <h1>Hisob-kitob va qarzdorlik</h1>
          <span id="accountingUser"></span>
        </div>
        <div>
          <button id="accountingLogout" class="danger-button">Chiqish</button>
        </div>
      </header>

      <section class="accounting-kpis">
        <article><span>Bugungi kirim</span><strong id="todayIncome">0 so‘m</strong></article>
        <article><span>Bugungi chiqim</span><strong id="todayExpense">0 so‘m</strong></article>
        <article><span>Bugungi foyda</span><strong id="todayProfit">0 so‘m</strong></article>
        <article><span>Oylik kirim</span><strong id="monthIncome">0 so‘m</strong></article>
        <article><span>Oylik chiqim</span><strong id="monthExpense">0 so‘m</strong></article>
        <article><span>Jami qarzdorlik</span><strong id="totalDebt">0 so‘m</strong></article>
      </section>

      <nav class="accounting-tabs">
        <button class="active" data-tab="operations">Kirim-chiqim</button>
        <button data-tab="debts">Qarzdorlik</button>
        <button data-tab="reports">Hisobotlar</button>
        <button data-tab="calculator">Kalkulyator</button>
      </nav>

      <section class="accounting-view active" data-view="operations">
        <div class="accounting-grid form-list">
          <form class="accounting-card accounting-form" id="operationForm">
            <h2>Yangi operatsiya</h2>
            <label>Turi<select id="operationType"><option value="income">Kirim</option><option value="expense">Chiqim</option></select></label>
            <label>Kategoriya<input id="operationCategory" required></label>
            <label>Summa<input id="operationAmount" type="number" min="0" required></label>
            <label>To‘lov turi<select id="paymentMethod"><option>Naqd</option><option>Bank</option><option>Click</option><option>Payme</option><option>Uzum</option></select></label>
            <label>Sana<input id="operationDate" type="date" required></label>
            <label>Izoh<textarea id="operationNote"></textarea></label>
            <button type="submit">Saqlash</button>
          </form>
          <article class="accounting-card">
            <div class="list-head"><h2>Operatsiyalar</h2><button id="exportCsv">CSV eksport</button></div>
            <div class="filter-row">
              <input id="operationSearch" placeholder="Qidirish...">
              <select id="filterType"><option value="">Barchasi</option><option value="income">Kirim</option><option value="expense">Chiqim</option></select>
              <input id="filterFrom" type="date">
              <input id="filterTo" type="date">
            </div>
            <div id="operationsList"></div>
          </article>
        </div>
      </section>

      <section class="accounting-view" data-view="debts">
        <div class="accounting-grid form-list">
          <form class="accounting-card accounting-form" id="debtForm">
            <input id="debtId" type="hidden">
            <h2>Qarzdorlik qo‘shish</h2>
            <label>Ism<input id="debtName" required></label>
            <label>Telefon<input id="debtPhone"></label>
            <label>Yo‘nalish<select id="debtDirection"><option value="receivable">Bizga qarzdor</option><option value="payable">Biz qarzdormiz</option></select></label>
            <label>Summa<input id="debtAmount" type="number" min="0" required></label>
            <label>Muddat<input id="debtDueDate" type="date"></label>
            <label>Izoh<textarea id="debtNote"></textarea></label>
            <button type="submit">Saqlash</button>
            <button type="button" id="cancelDebtEdit">Bekor qilish</button>
          </form>
          <article class="accounting-card">
            <input id="debtSearch" placeholder="Qarzdorni qidirish...">
            <div id="debtsList"></div>
          </article>
        </div>
      </section>

      <section class="accounting-view" data-view="reports">
        <div class="accounting-grid two">
          <article class="accounting-card"><h2>Oylik kirim-chiqim</h2><canvas id="monthlyChart"></canvas></article>
          <article class="accounting-card"><h2>Chiqim kategoriyalari</h2><canvas id="categoryExpenseChart"></canvas></article>
        </div>
        <article class="accounting-card"><div id="reportTable"></div></article>
      </section>

      <section class="accounting-view" data-view="calculator">
        <div class="accounting-grid two">
          <form class="accounting-card accounting-form" onsubmit="return false">
            <h2>Xizmat kalkulyatori</h2>
            <label>List soni<input id="sheetCount" type="number" min="0" value="0"></label>
            <label>Kesish narxi<input id="cutPrice" type="number" min="0" value="0"></label>
            <label>Kromka metri<input id="edgeMeters" type="number" min="0" value="0"></label>
            <label>Kromka narxi<input id="edgePrice" type="number" min="0" value="0"></label>
            <label>Teshish<input id="drillingCost" type="number" min="0" value="0"></label>
            <label>Material<input id="materialCost" type="number" min="0" value="0"></label>
            <label>Ish haqi<input id="laborCost" type="number" min="0" value="0"></label>
            <label>Boshqa xarajat<input id="otherCost" type="number" min="0" value="0"></label>
            <label>Sotuv narxi<input id="salePrice" type="number" min="0" value="0"></label>
          </form>
          <article class="accounting-card">
            <h2>Natija</h2>
            <p>Xizmatlar jami: <strong id="serviceTotal">0 so‘m</strong></p>
            <p>Hisoblangan foyda: <strong id="calculatedProfit">0 so‘m</strong></p>
            <p>Foyda foizi: <strong id="profitPercent">0%</strong></p>
          </article>
        </div>
      </section>
    </section>
  </main>

  <div id="accountingToast"></div>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
  <script type="module" src="./hisob.js?v=24.2"></script>
</body>
</html>
