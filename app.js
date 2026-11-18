// Инициализация Telegram.WebApp
if (window.Telegram?.WebApp) {
  const user = Telegram.WebApp.initDataUnsafe?.user;
  if (user) {
    document.getElementById('profile-name').textContent = user.first_name || 'Пользователь';
  }
}

// Переключение тем
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

// Проверка сохраненной темы в localStorage
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  body.classList.add(savedTheme);
  themeToggle.textContent = savedTheme === 'light-theme' ? '🌞' : '🌙';
}

themeToggle.addEventListener('click', () => {
  body.classList.toggle('light-theme');
  const isLight = body.classList.contains('light-theme');
  themeToggle.textContent = isLight ? '🌞' : '🌙';
  localStorage.setItem('theme', isLight ? 'light-theme' : 'dark-theme');
});

// Переключение вкладок
const tabs = document.querySelectorAll('.tab-content');
const navButtons = document.querySelectorAll('.nav-btn');
const viewMenuButtons = document.querySelectorAll('.view-menu');

function switchTab(tabId) {
  tabs.forEach(tab => tab.classList.remove('active'));
  navButtons.forEach(btn => btn.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  document.querySelector(`.nav-btn[data-tab="${tabId}"]`).classList.add('active');
}

navButtons.forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

viewMenuButtons.forEach(btn => {
  btn.addEventListener('click', () => switchTab('tab-menu'));
});

// Фильтрация меню
const filters = document.querySelectorAll('.filter');
const menuItems = document.querySelectorAll('.menu-item');

filters.forEach(filter => {
  filter.addEventListener('click', () => {
    filters.forEach(f => f.classList.remove('active'));
    filter.classList.add('active');
    const category = filter.dataset.filter;
    menuItems.forEach(item => {
      item.style.display = category === 'all' || item.dataset.category === category ? 'block' : 'none';
    });
  });
});

// Корзина
const cartItemsContainer = document.querySelector('.cart-items');
const cartBadge = document.querySelector('.cart-badge');
const checkoutButton = document.querySelector('.checkout');
const useBonusCheckbox = document.getElementById('use-bonus');
const resetBonusButton = document.getElementById('reset-bonus');
const totalAmountElement = document.getElementById('total-amount');
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let bonuses = parseInt(localStorage.getItem('bonuses')) || 350;

// Обновление баланса бонусов в интерфейсе
function updateBonuses() {
  document.querySelectorAll('#main-bonus, #bonus-balance').forEach(el => {
    el.textContent = bonuses;
  });
}

// Обновление итоговой суммы в корзине
function updateTotal() {
  let total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (useBonusCheckbox.checked && bonuses > 0) {
    total = Math.max(0, total - Math.min(bonuses, total));
  }
  totalAmountElement.textContent = total;
}

// Сброс демо-данных
resetBonusButton?.addEventListener('click', () => {
  bonuses = 350;
  localStorage.setItem('bonuses', bonuses);
  localStorage.setItem('orderHistory', JSON.stringify([]));
  updateBonuses();
  renderOrderHistory();
});

function updateCart() {
  cartItemsContainer.innerHTML = '';
  cart.forEach((item, index) => {
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    cartItem.innerHTML = `
      <div class="item-info">
        <h3>${item.name}</h3>
        <p>${item.price} ₽</p>
      </div>
      <div class="item-controls">
        <button class="decrease" data-index="${index}">-</button>
        <span>${item.quantity}</span>
        <button class="increase" data-index="${index}">+</button>
      </div>
    `;
    cartItemsContainer.appendChild(cartItem);
  });

  cartBadge.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
  localStorage.setItem('cart', JSON.stringify(cart));
  updateTotal();
}

// Добавление в корзину
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('add-to-cart')) {
    const name = e.target.closest('.card-content, .menu-item').querySelector('h2, h3').textContent;
    const price = parseInt(e.target.dataset.price);
    const existingItem = cart.find(item => item.name === name);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ name, price, quantity: 1 });
    }
    updateCart();
  }

  // Управление количеством
  if (e.target.classList.contains('increase')) {
    const index = parseInt(e.target.dataset.index);
    cart[index].quantity += 1;
    updateCart();
  }

  if (e.target.classList.contains('decrease')) {
    const index = parseInt(e.target.dataset.index);
    if (cart[index].quantity > 1) {
      cart[index].quantity -= 1;
    } else {
      cart.splice(index, 1);
    }
    updateCart();
  }
});

// Оформление заказа
checkoutButton.addEventListener('click', () => {
  if (cart.length === 0) return;
  
  let total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let usedBonuses = 0;
  
  if (useBonusCheckbox.checked && bonuses > 0) {
    usedBonuses = Math.min(bonuses, total);
    total -= usedBonuses;
    bonuses -= usedBonuses;
    localStorage.setItem('bonuses', bonuses);
    updateBonuses();
  }

  // Начисление 10% кэшбэка
  const cashback = Math.floor(total * 0.10);
  bonuses += cashback;
  localStorage.setItem('bonuses', bonuses);
  updateBonuses();

  try {
    const orderHistory = JSON.parse(localStorage.getItem('orderHistory')) || [];
    orderHistory.unshift({
      date: new Date().toLocaleString(),
      items: [...cart],
      total,
      usedBonuses,
      cashback
    });
    localStorage.setItem('orderHistory', JSON.stringify(orderHistory));
    cart = [];
    updateCart();
    renderOrderHistory();
    alert(`Заказ оформлен! Оплачено: ${total} ₽. Начислено кэшбэком: +${cashback} бонусов`);
  } catch (error) {
    console.error('Ошибка сохранения заказа:', error);
  }
});

// Отрисовка истории заказов
function renderOrderHistory() {
  const ordersContainer = document.querySelector('.orders');
  if (!ordersContainer) return;
  
  const orderHistory = JSON.parse(localStorage.getItem('orderHistory')) || [];
  ordersContainer.innerHTML = '';
  
  orderHistory.forEach(order => {
    const orderCard = document.createElement('div');
    orderCard.className = 'order-card';
    orderCard.innerHTML = `
      <div class="order-header">
        <span>${order.date}</span>
        <span class="order-total">${order.total} ₽</span>
      </div>
      <div class="order-items">
        ${order.items.map(item => `<div>${item.name} × ${item.quantity}</div>`).join('')}
      </div>
      <div class="order-footer">
        <span>Использовано бонусов: ${order.usedBonuses} ₽</span>
        <span>Начислено: +${order.cashback} бонусов</span>
      </div>
      <button class="repeat-order" data-items='${JSON.stringify(order.items)}'>Повторить заказ</button>
    `;
    ordersContainer.appendChild(orderCard);
  });

  // Обработка кнопки "Повторить заказ"
  document.querySelectorAll('.repeat-order').forEach(button => {
    button.addEventListener('click', () => {
      const items = JSON.parse(button.dataset.items);
      cart = [...items];
      updateCart();
      switchTab('tab-cart');
    });
  });
}

// Инициализация корзины и истории заказов
updateCart();
renderOrderHistory();
updateBonuses();
updateBonuses();

// Обновление итоговой суммы при изменении чекбокса бонусов
useBonusCheckbox.addEventListener('change', updateTotal);

// Обработка кнопки "В 1 клик" в карточке "Повторить прошлый заказ"
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('one-click') || e.target.closest('.repeat-card')) {
    const orderHistory = JSON.parse(localStorage.getItem('orderHistory')) || [];
    if (orderHistory.length > 0) {
      const lastOrder = orderHistory[0];
      cart = [...lastOrder.items];
      updateCart();
      switchTab('tab-cart');
      alert('Прошлый заказ добавлен в корзину!');
    } else {
      cart = [{ name: 'Комбо дня', price: 1190, quantity: 1 }];
      updateCart();
      switchTab('tab-cart');
      alert('Комбо дня добавлено в корзину!');
    }
  }
});
