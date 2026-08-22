const products = [
  { id: 'mutton', name: 'Mutton', price: 1000, unit: 'per kg', measure: 'Custom weight', weightBased: true },
  { id: 'head', name: 'Mutton Head', price: 300, unit: 'per piece', measure: 'Quantity' },
  { id: 'leg', name: 'Mutton Leg', price: 350, unit: 'per set of 4', measure: 'Set quantity' },
  { id: 'lung', name: 'Mutton Lung', price: 100, unit: 'per piece', measure: 'Quantity' },
  { id: 'liver', name: 'Mutton Liver', price: 1000, unit: 'per kg', measure: 'Custom weight', weightBased: true },
  { id: 'spleen', name: 'Mutton Spleen / Maneeral', price: 310, unit: 'per piece', measure: '1 piece', sunday: true },
  { id: 'stomach', name: 'Mutton Stomach', price: 250, unit: 'per piece', measure: 'Quantity' },
  { id: 'boneless', name: 'Mutton Bone & Boneless', price: 1240, unit: 'per kg', measure: 'Custom weight', weightBased: true },
  { id: 'chicken', name: 'Chicken', price: 315, unit: 'per kg', measure: 'Custom weight', weightBased: true }
];

const cart = [];
const formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSeSEHMOO97M0OhVF1dwFZpX9Ns6qYnJDNtwfIVmjN7kyVAB5Q/formResponse';
const store = { lat: 13.1347803, lng: 80.1312823 };

const money = value => `₹${Math.round(value).toLocaleString('en-IN')}`;
const formatWeight = grams => grams >= 1000 ? `${Number((grams / 1000).toFixed(2))} kg` : `${grams} g`;
const getLinePrice = item => (item.product.price || 0) * (item.grams ? item.grams / 1000 : 1) * item.quantity;
const getCartSubtotal = () => cart.reduce((total, item) => total + getLinePrice(item), 0);
const getCartCount = () => cart.reduce((total, item) => total + item.quantity, 0);
const isSunday = dateValue => dateValue && new Date(`${dateValue}T12:00:00`).getDay() === 0;
const calculateDelivery = distance => {
  const km = Math.max(Number(distance) || 1, 1);
  const porterEstimate = (48 + Math.max(0, km - 1) * 10) * 1.2075;
  return Math.ceil(porterEstimate);
};

function renderProducts() {
  document.querySelector('#product-grid').innerHTML = products.map(product => `
    <article class="product-card ${product.sunday ? 'sunday' : ''} ${product.weightBased ? 'weight-product' : ''}">
      <h4>${product.name}</h4>
      <p class="product-unit">${product.measure}</p>
      ${product.weightBased ? `<label class="weight-picker"><span>Choose kg / grams</span><div class="weight-customizer"><input type="number" min="0.1" max="5" step="0.1" value="1" inputmode="decimal" data-weight-input="${product.id}" aria-label="Choose ${product.name} weight" /><select data-weight-unit="${product.id}" aria-label="Weight unit for ${product.name}"><option value="kg">kg</option><option value="g">grams</option></select></div></label>` : ''}
      ${product.sunday ? '<span class="sunday-label">Sunday only</span>' : ''}
      <div class="product-foot">
        <div class="product-price"><strong>${product.price ? money(product.price) : 'On request'}</strong><span>${product.unit}</span></div>
        <button class="add-product" type="button" data-add="${product.id}" ${product.price ? '' : 'disabled title="Price to be confirmed by store"'} aria-label="Add ${product.name} to cart">+</button>
      </div>
    </article>`).join('');
}

function updateCart() {
  const lines = document.querySelector('[data-cart-lines]');
  const count = getCartCount();
  document.querySelector('[data-cart-count]').textContent = count;
  document.querySelector('[data-cart-subtotal]').textContent = money(getCartSubtotal());
  if (!cart.length) {
    lines.innerHTML = '<div class="empty-cart"><p>Your cart is waiting for something fresh.<br><small>Add cuts from the catalogue to begin.</small></p></div>';
    return;
  }
  lines.innerHTML = cart.map(item => `
    <div class="cart-line">
      <div><h4>${item.product.name}</h4><small>${item.grams ? `${formatWeight(item.grams)} · ` : ''}${item.product.unit}</small><div class="quantity-control"><button type="button" data-adjust="${item.product.id}" data-grams="${item.grams || ''}" data-change="-1" aria-label="Remove one ${item.product.name}">−</button><span>${item.quantity}</span><button type="button" data-adjust="${item.product.id}" data-grams="${item.grams || ''}" data-change="1" aria-label="Add one ${item.product.name}">+</button></div></div>
      <div class="cart-line-price">${money(getLinePrice(item))}</div>
    </div>`).join('');
}

function addProduct(id) {
  const product = products.find(item => item.id === id);
  if (product.sunday && !isSunday(getSelectedDate())) {
    showToast('Mutton Spleen / Maneeral can be ordered for Sunday delivery only.');
    return;
  }
  const weightInput = document.querySelector(`[data-weight-input="${id}"]`);
  const weightUnit = document.querySelector(`[data-weight-unit="${id}"]`);
  const grams = product.weightBased ? Math.round(Number(weightInput.value) * (weightUnit.value === 'kg' ? 1000 : 1)) : null;
  if (product.weightBased && (!Number.isFinite(grams) || grams < 100 || grams > 5000)) {
    showToast('Please select between 100 grams and 5 kg.');
    return;
  }
  const existing = cart.find(item => item.product.id === id && item.grams === grams);
  if (existing) existing.quantity += 1;
  else cart.push({ product, quantity: 1, grams });
  updateCart();
  showToast(`${product.name}${grams ? ` · ${formatWeight(grams)}` : ''} added to your cart · View cart →`, true);
}

function syncWeightUnit(select) {
  const input = document.querySelector(`[data-weight-input="${select.dataset.weightUnit}"]`);
  const value = Number(input.value);
  if (select.value === 'g') {
    input.min = '100'; input.max = '5000'; input.step = '50';
    if (value > 0 && value <= 5) input.value = String(value * 1000);
  } else {
    input.min = '0.1'; input.max = '5'; input.step = '0.1';
    if (value > 5) input.value = String(value / 1000);
  }
}

function adjustProduct(id, grams, change) {
  const index = cart.findIndex(item => item.product.id === id && String(item.grams || '') === String(grams || ''));
  if (index === -1) return;
  cart[index].quantity += change;
  if (cart[index].quantity < 1) cart.splice(index, 1);
  updateCart();
  syncCheckoutTotal();
}

function getSelectedDate() { return document.querySelector('[name="deliveryDate"]')?.value; }
function openCart() { document.querySelector('[data-cart-drawer]').classList.add('open'); document.querySelector('[data-cart-drawer]').setAttribute('aria-hidden', 'false'); document.querySelector('[data-backdrop]').classList.add('show'); }
function closeCart() { document.querySelector('[data-cart-drawer]').classList.remove('open'); document.querySelector('[data-cart-drawer]').setAttribute('aria-hidden', 'true'); document.querySelector('[data-backdrop]').classList.remove('show'); }
function showToast(message, opensCart = false) { const toast = document.querySelector('[data-toast]'); toast.textContent = message; toast.disabled = !opensCart; toast.dataset.action = opensCart ? 'cart' : ''; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 2800); }

function setMinDate() {
  const delivery = document.querySelector('[name="deliveryDate"]');
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const value = tomorrow.toISOString().slice(0, 10);
  delivery.min = value;
  delivery.value = value;
}

function syncCheckoutTotal() {
  const distance = document.querySelector('[name="distance"]');
  const delivery = calculateDelivery(distance?.value);
  const subtotal = getCartSubtotal();
  document.querySelector('[data-checkout-items]').textContent = money(subtotal);
  document.querySelector('[data-checkout-delivery]').textContent = money(delivery);
  document.querySelector('[data-checkout-total]').textContent = money(subtotal + delivery);
  document.querySelector('[data-payment-total]').textContent = money(subtotal + delivery);
}

function showCheckoutStep(step) {
  document.querySelectorAll('[data-checkout-step]').forEach(section => { section.hidden = section.dataset.checkoutStep !== step; });
}
function openCheckout() {
  if (!cart.length) { showToast('Add at least one product before checkout.'); return; }
  closeCart(); syncCheckoutTotal(); showCheckoutStep('details'); document.querySelector('[data-checkout-modal]').showModal();
}
function closeCheckout() { document.querySelector('[data-checkout-modal]').close(); }

function copyUpiId(button) {
  const upiId = document.querySelector('[data-upi-id]').textContent.trim();
  const done = () => {
    const label = button.querySelector('span');
    const original = label.textContent;
    label.textContent = 'Copied';
    button.classList.add('copied');
    showToast('UPI ID copied — paste it in your UPI app.');
    setTimeout(() => { label.textContent = original; button.classList.remove('copied'); }, 1800);
  };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(upiId).then(done).catch(done);
  else done();
}

function toRadians(value) { return value * Math.PI / 180; }
function distanceFromStore(lat, lng) {
  const earthRadius = 6371;
  const dLat = toRadians(lat - store.lat); const dLng = toRadians(lng - store.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(store.lat)) * Math.cos(toRadians(lat)) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function locateCustomer() {
  if (!navigator.geolocation) { showToast('Location is not supported on this device. Enter your route distance instead.'); return; }
  showToast('Finding your approximate distance from the stall…');
  navigator.geolocation.getCurrentPosition(position => {
    const distance = Math.max(.5, distanceFromStore(position.coords.latitude, position.coords.longitude));
    document.querySelector('[name="distance"]').value = distance.toFixed(1); syncCheckoutTotal(); showToast('Approximate distance updated.');
  }, () => showToast('Location wasn’t shared. Please enter the route distance manually.'), { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
}

async function submitOrder(details, deliveryCharge, total) {
  const orderText = cart.map(item => `${item.product.name}${item.grams ? ` (${formatWeight(item.grams)})` : ''} × ${item.quantity} (${money(getLinePrice(item))})`).join('; ');
  const productDescription = `${orderText}${details.notes ? ` | Cutting notes: ${details.notes}` : ''} | Items: ${money(getCartSubtotal())}; Delivery: ${money(deliveryCharge)}; Total: ${money(total)}`;
  const [year, month, day] = details.deliveryDate.split('-');
  const [hour, minute] = details.deliveryTime.split(':');
  const payload = new URLSearchParams({
    'entry.1238577414': details.customerName,
    'entry.1320762068': details.phone,
    'entry.1598800685': `${details.address}, ${details.pincode}`,
    'entry.1009895387': productDescription,
    'entry.1231058733_year': year,
    'entry.1231058733_month': month,
    'entry.1231058733_day': day,
    'entry.149414801_hour': hour,
    'entry.149414801_minute': minute
  });
  try { await fetch(formUrl, { method: 'POST', mode: 'no-cors', body: payload }); return true; }
  catch (error) { console.warn('Order sync pending', error); return false; }
}

document.addEventListener('click', event => {
  const add = event.target.closest('[data-add]'); if (add) addProduct(add.dataset.add);
  const adjust = event.target.closest('[data-adjust]'); if (adjust) adjustProduct(adjust.dataset.adjust, adjust.dataset.grams, Number(adjust.dataset.change));
  if (event.target.closest('[data-open-cart]')) openCart();
  if (event.target.closest('[data-close-cart]')) closeCart();
  if (event.target.closest('[data-open-checkout]')) openCheckout();
  if (event.target.closest('[data-toast][data-action="cart"]')) { openCart(); document.querySelector('[data-toast]').classList.remove('show'); }
  if (event.target.closest('[data-close-checkout]')) closeCheckout();
  if (event.target.matches('[data-backdrop]')) closeCart();
  if (event.target.closest('[data-use-location]')) locateCustomer();
  const copyUpi = event.target.closest('[data-copy-upi]');
  if (copyUpi) copyUpiId(copyUpi);
  if (event.target.closest('[data-open-partner]')) document.querySelector('[data-partner-modal]').showModal();
  if (event.target.closest('[data-close-partner]')) document.querySelector('[data-partner-modal]').close();
  if (event.target.closest('[data-confirm-payment]')) {
    const details = Object.fromEntries(new FormData(document.querySelector('#checkout-form')).entries());
    const orderNo = `OK-${Date.now().toString().slice(-6)}`;
    document.querySelector('[data-order-receipt]').innerHTML = `<b>${orderNo}</b><br>${details.deliveryDate} · ${details.deliveryTime}<br>${cart.map(item => `${item.product.name}${item.grams ? ` (${formatWeight(item.grams)})` : ''} × ${item.quantity}`).join(', ')}<br>Paid amount declared: ${document.querySelector('[data-payment-total]').textContent}`;
    showCheckoutStep('success');
  }
});

document.addEventListener('change', event => { if (event.target.matches('[data-weight-unit]')) syncWeightUnit(event.target); });

document.querySelector('#quick-distance').addEventListener('input', event => { document.querySelector('#quick-delivery').textContent = money(calculateDelivery(event.target.value)); });
document.querySelector('[name="distance"]').addEventListener('input', syncCheckoutTotal);
document.querySelector('[name="deliveryDate"]').addEventListener('change', () => { if (!isSunday(getSelectedDate()) && cart.some(item => item.product.id === 'spleen')) { const index = cart.findIndex(item => item.product.id === 'spleen'); cart.splice(index, 1); updateCart(); showToast('Sunday special removed: choose a Sunday to order it.'); } syncCheckoutTotal(); });

document.querySelector('#checkout-form').addEventListener('submit', async event => {
  event.preventDefault();
  const details = Object.fromEntries(new FormData(event.target).entries());
  if (!cart.length) return;
  if (!isSunday(details.deliveryDate) && cart.some(item => item.product.id === 'spleen')) { showToast('Mutton Spleen / Maneeral requires a Sunday delivery date.'); return; }
  const delivery = calculateDelivery(details.distance); const total = getCartSubtotal() + delivery;
  const submitButton = event.submitter; submitButton.disabled = true; submitButton.textContent = 'Saving your order…';
  const synced = await submitOrder(details, delivery, total);
  submitButton.disabled = false; submitButton.innerHTML = 'Continue to UPI payment <span>→</span>';
  document.querySelector('[data-upi-link]').href = `upi://pay?pa=6369037332@upi&pn=Order%20Kio&am=${total.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Order Kio pre-order ${details.deliveryDate}`)}`;
  showCheckoutStep('payment');
  showToast(synced ? 'Order details saved to the store order sheet.' : 'Order details are ready; please keep this page open while you pay.');
});

document.querySelector('[data-partner-form]').addEventListener('submit', event => { event.preventDefault(); event.target.hidden = true; document.querySelector('.partner-success').textContent = 'Thank you. Your interest is ready to be connected to the partner-management workflow.'; document.querySelector('.partner-success').hidden = false; });

renderProducts(); updateCart(); setMinDate(); syncCheckoutTotal();
