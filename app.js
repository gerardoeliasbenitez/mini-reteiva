// Configuración de Dexie.js para Base de Datos Local Avanzada (IndexedDB)
const db = new Dexie('MiniReteivaDatabase');
db.version(1).stores({
  retenciones: 'id, fecha, rif, nombre, comprobante'
});

// Inicialización de Iconos Lucide
document.addEventListener('DOMContentLoaded', async () => {
  lucide.createIcons();
  await cargarRegistros();
});

// Abrir Formulario Nuevo
function abrirFormularioNuevo() {
  document.getElementById('reteForm').reset();
  document.getElementById('recordId').value = '';
  document.getElementById('formTitle').innerHTML = '<i data-lucide="edit-3" class="w-5 h-5 text-emerald-600"></i> Registrar Comprobante de Retención';
  
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('fechaEmision').value = hoy;
  document.getElementById('numComprobante').value = new Date().getFullYear() + String(Math.floor(Math.random() * 90000) + 10000);

  calcularImpuestos();
  document.getElementById('formContainer').classList.remove('hidden');
  lucide.createIcons();
}

function cerrarFormulario() {
  document.getElementById('formContainer').classList.add('hidden');
}

// Formatear RIF SENIAT automáticamente (V, J, G, E, P)
function formatearRIF(input) {
  let val = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (val.length > 1 && !val.includes('-')) {
    val = val.charAt(0) + '-' + val.substring(1);
  }
  if (val.length > 10 && val.split('-').length === 2) {
    val = val.substring(0, 10) + '-' + val.substring(10, 11);
  }
  input.value = val;
}

// Cálculo matemático según normativas SENIAT
function calcularImpuestos() {
  const base = parseFloat(document.getElementById('baseImponible').value) || 0;
  const alicuota = parseFloat(document.getElementById('alicuotaIVA').value) || 0;
  const porcRet = parseFloat(document.getElementById('porcentajeRetencion').value) || 0;

  const montoIVA = base * (alicuota / 100);
  const montoRetenido = montoIVA * (porcRet / 100);
  const netoPagar = base + (montoIVA - montoRetenido);

  document.getElementById('resMontoIVA').innerText = `Bs. ${montoIVA.toLocaleString('es-VE', {minimumFractionDigits: 2})}`;
  document.getElementById('resMontoRetenido').innerText = `Bs. ${montoRetenido.toLocaleString('es-VE', {minimumFractionDigits: 2})}`;
  document.getElementById('resNetoPagar').innerText = `Bs. ${netoPagar.toLocaleString('es-VE', {minimumFractionDigits: 2})}`;

  return { base, alicuota, porcRet, montoIVA, montoRetenido, netoPagar };
}

// Operación CRUD: Guardar o Actualizar registro
async function guardarRetencion(e) {
  e.preventDefault();
  const id = document.getElementById('recordId').value;
  const calc = calcularImpuestos();

  const registro = {
    id: id ? id : 'RET-' + Date.now(),
    rif: document.getElementById('rifProveedor').value,
    nombre: document.getElementById('nombreProveedor').value,
    fecha: document.getElementById('fechaEmision').value,
    factura: document.getElementById('numFactura').value,
    control: document.getElementById('numControl').value,
    comprobante: document.getElementById('numComprobante').value,
    base: calc.base,
    alicuota: calc.alicuota,
    porcRet: calc.porcRet,
    montoIVA: calc.montoIVA,
    montoRetenido: calc.montoRetenido,
    netoPagar: calc.netoPagar
  };

  await db.retenciones.put(registro);
  cerrarFormulario();
  await cargarRegistros();
}

// Cargar y Renderizar registros desde Dexie.js
async function cargarRegistros(filtro = '') {
  let lista = await db.retenciones.toArray();

  if (filtro) {
    const text = filtro.toLowerCase();
    lista = lista.filter(r => 
      r.rif.toLowerCase().includes(text) || 
      r.nombre.toLowerCase().includes(text) || 
      r.comprobante.toLowerCase().includes(text)
    );
  }

  const tbody = document.getElementById('recordsTableBody');
  tbody.innerHTML = '';

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center p-6 text-slate-400">No hay comprobantes registrados.</td></tr>`;
    actualizarMetricas([]);
    return;
  }

  lista.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50 transition border-b border-slate-100";
    tr.innerHTML = `
      <td class="p-3 font-bold text-blue-900">${r.comprobante}</td>
      <td class="p-3 text-slate-600">${r.fecha}</td>
      <td class="p-3">
        <strong class="text-slate-800 block">${r.rif}</strong>
        <span class="text-xs text-slate-500">${r.nombre}</span>
      </td>
      <td class="p-3 text-slate-700">Bs. ${r.base.toLocaleString('es-VE', {minimumFractionDigits: 2})}</td>
      <td class="p-3 text-slate-700">Bs. ${r.montoIVA.toLocaleString('es-VE', {minimumFractionDigits: 2})}</td>
      <td class="p-3 font-bold text-emerald-600">Bs. ${r.montoRetenido.toLocaleString('es-VE', {minimumFractionDigits: 2})} <span class="text-xs font-normal text-slate-500">(${r.porcRet}%)</span></td>
      <td class="p-3 text-center space-x-1">
        <button onclick="generarPDF('${r.id}')" class="bg-blue-700 hover:bg-blue-800 text-white p-1.5 rounded text-xs inline-flex items-center gap-1 shadow transition" title="Generar PDF">
          <i data-lucide="printer" class="w-3.5 h-3.5"></i>
        </button>
        <button onclick="editarRegistro('${r.id}')" class="bg-slate-600 hover:bg-slate-700 text-white p-1.5 rounded text-xs inline-flex items-center gap-1 shadow transition" title="Editar">
          <i data-lucide="edit" class="w-3.5 h-3.5"></i>
        </button>
        <button onclick="eliminarRegistro('${r.id}')" class="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded text-xs inline-flex items-center gap-1 shadow transition" title="Eliminar">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  actualizarMetricas(await db.retenciones.toArray());
  lucide.createIcons();
}

function filtrarRegistros() {
  const text = document.getElementById('searchInput').value;
  cargarRegistros(text);
}

async function editarRegistro(id) {
  const r = await db.retenciones.get(id);
  if (!r) return;

  document.getElementById('recordId').value = r.id;
  document.getElementById('rifProveedor').value = r.rif;
  document.getElementById('nombreProveedor').value = r.nombre;
  document.getElementById('fechaEmision').value = r.fecha;
  document.getElementById('numFactura').value = r.factura;
  document.getElementById('numControl').value = r.control;
  document.getElementById('numComprobante').value = r.comprobante;
  document.getElementById('baseImponible').value = r.base;
  document.getElementById('alicuotaIVA').value = r.alicuota;
  document.getElementById('porcentajeRetencion').value = r.porcRet;

  document.getElementById('formTitle').innerHTML = '<i data-lucide="edit-3" class="w-5 h-5 text-emerald-600"></i> Editar Comprobante de Retención';
  calcularImpuestos();
  document.getElementById('formContainer').classList.remove('hidden');
  lucide.createIcons();
}

async function eliminarRegistro(id) {
  if (confirm('¿Desea eliminar este comprobante del registro?')) {
    await db.retenciones.delete(id);
    await cargarRegistros();
  }
}

function actualizarMetricas(lista) {
  document.getElementById('statTotal').innerText = lista.length;
  const totalRetenido = lista.reduce((acc, curr) => acc + curr.montoRetenido, 0);
  document.getElementById('statMontoRetenido').innerText = `Bs. ${totalRetenido.toLocaleString('es-VE', {minimumFractionDigits: 2})}`;
}

// Generador de Comprobante PDF individual
async function generarPDF(id) {
  const r = await db.retenciones.get(id);
  if (!r) return;

  document.getElementById('pdfComprobante').innerText = r.comprobante;
  document.getElementById('pdfFechaEmision').innerText = r.fecha;
  document.getElementById('pdfNombreProv').innerText = r.nombre;
  document.getElementById('pdfRifProv').innerText = r.rif;
  document.getElementById('pdfFactura').innerText = r.factura;
  document.getElementById('pdfControl').innerText = r.control;
  document.getElementById('pdfBase').innerText = r.base.toFixed(2);
  document.getElementById('pdfAlicuota').innerText = `${r.alicuota}%`;
  document.getElementById('pdfMontoIVA').innerText = r.montoIVA.toFixed(2);
  document.getElementById('pdfPorcRet').innerText = `${r.porcRet}%`;
  document.getElementById('pdfRetenido').innerText = r.montoRetenido.toFixed(2);

  const container = document.getElementById('pdfTemplate');
  container.classList.remove('hidden');

  const opt = {
    margin: 0.5,
    filename: `Comprobante_Retencion_${r.comprobante}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(container).save().then(() => {
    container.classList.add('hidden');
  });
}

// Exportar Base de Datos a Excel (.xlsx) usando ExcelJS
async function exportarExcel() {
  const lista = await db.retenciones.toArray();
  if (lista.length === 0) {
    alert('No hay registros para exportar.');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Relacion_Retenciones');

  sheet.columns = [
    { header: 'Comprobante', key: 'comprobante', width: 15 },
    { header: 'Fecha', key: 'fecha', width: 12 },
    { header: 'RIF Proveedor', key: 'rif', width: 15 },
    { header: 'Nombre Proveedor', key: 'nombre', width: 25 },
    { header: 'Base Imponible', key: 'base', width: 15 },
    { header: 'Monto IVA', key: 'montoIVA', width: 15 },
    { header: 'Monto Retenido', key: 'montoRetenido', width: 15 }
  ];

  lista.forEach(r => sheet.addRow(r));

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Relacion_Retencion_IVA_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
}

// Exportar / Importar Respaldo JSON
async function exportarJSON() {
  const lista = await db.retenciones.toArray();
  const blob = new Blob([JSON.stringify(lista, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Respaldo_Reteiva_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
}

async function importarJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function(event) {
    try {
      const data = JSON.parse(event.target.result);
      if (Array.isArray(data)) {
        await db.retenciones.clear();
        await db.retenciones.bulkPut(data);
        await cargarRegistros();
        alert('Datos importados con éxito.');
      }
    } catch (err) {
      alert('Error al leer el archivo JSON.');
    }
  };
  reader.readAsText(file);
}