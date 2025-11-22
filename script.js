// Datos de métodos de pago
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

// NUEVA URL ACTUALIZADA
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbygvQwsi41X8PLkcWUR8wu-W0GImmjJSBqoP2GgpjFQvgcksMBvWoNKw0p-zA-gHWUb/exec';

// Estado de la aplicación
let receipts = JSON.parse(localStorage.getItem('raffleReceipts')) || [];

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    initializePaymentButtons();
    initializeUploadForm();
    loadReceipts();
});

// Configurar botones de pago
function initializePaymentButtons() {
    const paymentButtons = document.querySelectorAll('.payment-btn');
    const paymentDetails = document.getElementById('payment-details');
    const paymentTitle = document.getElementById('payment-title');
    const paymentInfo = document.getElementById('payment-info');

    paymentButtons.forEach(button => {
        button.addEventListener('click', function() {
            const method = this.dataset.method;
            const methodData = paymentMethods[method];
            
            paymentTitle.textContent = methodData.title;
            paymentInfo.textContent = methodData.data;
            paymentDetails.classList.remove('hidden');
            
            // Scroll a la sección de detalles
            paymentDetails.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// Función para obtener IP del usuario
async function getUserIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    return 'No disponible';
  }
}

// Función para convertir archivo a Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Configurar formulario de subida
function initializeUploadForm() {
    const form = document.getElementById('upload-form');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validar archivo
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

        // Mostrar loading
        const submitBtn = form.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '⏳ Enviando...';
        submitBtn.disabled = true;

        try {
            // Obtener IP del usuario
            const userIp = await getUserIP();
            
            // Convertir imagen a Base64
            const comprobanteBase64 = await fileToBase64(file);
            
            const formData = {
                timestamp: new Date().toLocaleString('es-PA'),
                nombre: document.getElementById('participant-name').value,
                email: document.getElementById('participant-email').value,
                telefono: document.getElementById('participant-phone').value,
                tickets_normales: parseInt(document.getElementById('tickets-normal').value) || 0,
                tickets_premium: parseInt(document.getElementById('tickets-premium').value) || 0,
                metodo_pago: document.getElementById('payment-method').value,
                comprobante: comprobanteBase64,
                nombre_archivo: file.name,
                ip: userIp
            };

            // Validar que al menos un ticket sea mayor a 0
            if (formData.tickets_normales === 0 && formData.tickets_premium === 0) {
                alert('Por favor, selecciona al menos 1 ticket.');
                return;
            }

            console.log('Enviando datos...', {
                nombre: formData.nombre,
                email: formData.email,
                telefono: formData.telefono,
                tickets_normales: formData.tickets_normales,
                tickets_premium: formData.tickets_premium
            });

            // ENVÍO SIMPLIFICADO - Sin archivo base64 primero (es muy grande)
            const testData = {
                timestamp: formData.timestamp,
                nombre: formData.nombre,
                email: formData.email,
                telefono: formData.telefono,
                tickets_normales: formData.tickets_normales,
                tickets_premium: formData.tickets_premium,
                metodo_pago: formData.metodo_pago,
                comprobante: 'test_sin_imagen', // Sin archivo para probar
                nombre_archivo: file.name,
                ip: formData.ip
            };

            console.log('Datos a enviar:', testData);

            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(testData),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Respuesta del servidor:', result);
            
            if (result.success) {
                alert('✅ Comprobante enviado correctamente. Te notificaremos cuando sea verificado.');
                form.reset();
                
                // También guardar localmente para mostrar en la página
                const localData = {
                    id: Date.now(),
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
                
            } else {
                throw new Error(result.error || 'Error desconocido del servidor');
            }

        } catch (error) {
            console.error('Error completo:', error);
            
            let errorMsg = '❌ Error al enviar el comprobante. ';
            
            if (error.message.includes('Failed to fetch')) {
                errorMsg += 'Problema de conexión. ';
            } else if (error.message.includes('CORS')) {
                errorMsg += 'Error de permisos. ';
            }
            
            errorMsg += '\nError: ' + error.message;
            alert(errorMsg);
            
        } finally {
            // Restaurar botón
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Cargar lista de comprobantes
function loadReceipts() {
    const receiptsList = document.getElementById('receipts-list');
    
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

// Obtener texto del estado
function getStatusText(status) {
    const statusMap = {
        processing: '🔄 En Proceso',
        verified: '✅ Verificado',
        rejected: '❌ Rechazado'
    };
    return statusMap[status] || status;
}

// Guardar en localStorage
function saveReceipts() {
    localStorage.setItem('raffleReceipts', JSON.stringify(receipts));
}

// Copiar datos al portapapeles
function copyToClipboard() {
    const paymentInfo = document.getElementById('payment-info');
    const textArea = document.createElement('textarea');
    textArea.value = paymentInfo.textContent;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    // Mostrar confirmación
    const copyBtn = document.querySelector('.copy-btn');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '✅ Copiado!';
    copyBtn.style.background = '#48bb78';
    
    setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.background = '';
    }, 2000);
}