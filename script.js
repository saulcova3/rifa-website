const paymentMethods = {
transferencia: {
title: "Transferencia Bancaria",
data: `Banco: Banco General Panamá
Titular: Juan Pérez
Cuenta: 123-456789-1-234
CLABE: 123456789012345678
Tipo de Cuenta: Cuenta Corriente`
},
paypal: {
title: "PayPal",
data: `Email de PayPal: rifas@ejemplo.com
Nota: Envíe el pago como "Amigos y Familia"
Monto: $10 por número`
},
binance: {
title: "Binance",
data: `ID de Binance: 987654321
Email: pagos@rifas.com
USDT Address: TAbc123...xyz
QR Code: [Escanea para pagar]`
},
yappy: {
title: "Yappy",
data: `Número de Celular: +507 6123-4567
Banco: Banco General
Nombre: María Rodríguez
Monto: $10.00`
}
};
let receipts = JSON.parse(localStorage.getItem('raffleReceipts')) || [];
function initApp() {
console.log('🔄 Inicializando aplicación...');
initializePaymentButtons();
initializeUploadForm();
loadReceipts();
console.log('✅ Aplicación inicializada');
}
function initializePaymentButtons() {
const paymentButtons = document.querySelectorAll('.payment-btn');
const paymentDetails = document.getElementById('payment-details');
if (!paymentButtons.length || !paymentDetails) {
console.log('⚠️ Botones de pago no encontrados');
return;
}
paymentButtons.forEach(button => {
button.addEventListener('click', function() {
const method = this.dataset.method;
const methodData = paymentMethods[method];
paymentTitle.textContent = methodData.title;
paymentInfo.textContent = methodData.data;
paymentDetails.classList.remove('hidden');
paymentDetails.scrollIntoView({ behavior: 'smooth' });
});
});
}
async function getUserIP() {
try {
const response = await fetch('https://api.ipify.org?format=json');
const data = await response.json();
return data.ip;
} catch (error) {
return 'No disponible';
}
}
async function initializeUploadForm() {
const form = document.getElementById('upload-form');
if (!form) {
console.log('❌ Formulario no encontrado');
return;
}
form.addEventListener('submit', async function(e) {
e.preventDefault();
const file = document.getElementById('payment-proof').files[0];
if (!file) {
alert('Por favor, selecciona un comprobante.');
return;
}
const maxSize = 5 * 1024 * 1024;
if (file.size > maxSize) {
alert('El archivo es demasiado grande. Máximo 5MB.');
return;
}
const submitBtn = form.querySelector('.submit-btn');
const originalText = submitBtn.textContent;
submitBtn.textContent = '⏳ Enviando...';
submitBtn.disabled = true;
try {
if (!window.db || !window.storage) {
throw new Error('Firebase no está inicializado. Recarga la página.');
}
const userIp = await getUserIP();
const formData = {
timestamp: new Date().toLocaleString('es-PA'),
nombre: document.getElementById('participant-name').value,
email: document.getElementById('participant-email').value,
telefono: document.getElementById('participant-phone').value,
tickets_normales: parseInt(document.getElementById('tickets-normal').value) || 0,
tickets_premium: parseInt(document.getElementById('tickets-premium').value) || 0,
metodo_pago: document.getElementById('payment-method').value,
ip: userIp
};
if (formData.tickets_normales === 0 && formData.tickets_premium === 0) {
alert('Por favor, selecciona al menos 1 ticket.');
return;
}
console.log('Subiendo a Firebase...', formData);
const storageRef = window.storage.ref().child('comprobantes/' + Date.now() + '_' + file.name);
const snapshot = await storageRef.put(file);
const imageUrl = await snapshot.ref.getDownloadURL();
console.log('✅ Imagen subida:', imageUrl);
const docRef = await window.db.collection('participantes').add({
...formData,
comprobanteUrl: imageUrl,
nombre_archivo: file.name,
estado: 'pendiente',
timestamp: firebase.firestore.FieldValue.serverTimestamp()
});
console.log('✅ Documento guardado con ID:', docRef.id);
alert('✅ Comprobante enviado correctamente. Te notificaremos cuando sea verificado.');
form.reset();
const localData = {
id: docRef.id,
name: formData.nombre,
email: formData.email,
method: formData.metodo_pago,
fileName: file.name,
timestamp: formData.timestamp,
status: 'processing'
};
receipts.push(localData);
saveReceipts();
loadReceipts();
} catch (error) {
console.error('❌ Error completo:', error);
alert('❌ Error al enviar el comprobante: ' + error.message);
} finally {
submitBtn.textContent = originalText;
submitBtn.disabled = false;
}
});
}
function loadReceipts() {
const receiptsList = document.getElementById('receipts-list');
if (!receiptsList) {
console.log('⚠️ receipts-list no encontrado');
return;
}
if (receipts.length === 0) {
receiptsList.innerHTML = '<p style="text-align: center; color: #666;">No hay comprobantes enviados.</p>';
return;
}
receiptsList.innerHTML = receipts.map(receipt => `
<div class="receipt-item">
<div class="receipt-info">
<h4>${receipt.name}</h4>
<p><strong>Método:</strong> ${paymentMethods[receipt.method]?.title || receipt.method}</p>
<p><strong>Fecha:</strong> ${receipt.timestamp}</p>
<p><strong>Archivo:</strong> ${receipt.fileName}</p>
</div>
<div class="status-badge status-${receipt.status}">
${getStatusText(receipt.status)}
</div>
</div>
`).join('');
}
function getStatusText(status) {
const statusMap = {
processing: '🔄 En Proceso',
verified: '✅ Verificado',
rejected: '❌ Rechazado'
};
return statusMap[status] || status;
}
function saveReceipts() {
localStorage.setItem('raffleReceipts', JSON.stringify(receipts));
}
function copyToClipboard() {
const paymentInfo = document.getElementById('payment-info');
const textArea = document.createElement('textarea');
textArea.value = paymentInfo.textContent;
document.body.appendChild(textArea);
textArea.select();
document.execCommand('copy');
document.body.removeChild(textArea);
const copyBtn = document.querySelector('.copy-btn');
const originalText = copyBtn.textContent;
copyBtn.textContent = '✅ Copiado!';
copyBtn.style.background = '#48bb78';
setTimeout(() => {
copyBtn.textContent = originalText;
copyBtn.style.background = '';
}, 2000);
}
initApp();