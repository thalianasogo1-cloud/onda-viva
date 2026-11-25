// 1. Presentadores de Onda Viva y datos de ejemplo iniciales
const basePresentadores = ["Mariana Restrepo", "Sebastián Cardona", "Salomé Henao", "Tomás Giraldo", "Manuela Jaramillo", "Juan José Vélez"];
let presentadores = JSON.parse(localStorage.getItem("presentadores_onda")) || basePresentadores;
const datosEjemplo = [
  { fecha: "2026-11-25", programa: "Despierta Onda", inicio: "06:00", fin: "08:00", titular: "Mariana Restrepo", relevo: "Sebastián Cardona", estado: "Cubierto", motivo: "Cita médica", obs: "Aviso temprano" },
  { fecha: "2026-11-26", programa: "Tarde Musical", inicio: "14:00", fin: "16:00", titular: "Salomé Henao", relevo: "Sin asignar", estado: "Pendiente", motivo: "Permiso", obs: "Buscando reemplazo" }
];

// Cargar registros guardados o usar los de ejemplo
let relevos = JSON.parse(localStorage.getItem("relevos_onda")) || datosEjemplo;

function guardarDatos() {
  localStorage.setItem("relevos_onda", JSON.stringify(relevos));
}

// Funcion auxiliar: calcular horas entre inicio y fin
function calcularHoras(inicio, fin) {
  const [h1, m1] = inicio.split(":").map(Number);
  const [h2, m2] = fin.split(":").map(Number);
  return Math.max(0, ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60);
}

// Funcion auxiliar: obtener numero de semana del año
function obtenerSemana(fechaTexto) {
  const fecha = new Date(fechaTexto + "T00:00:00");
  const inicioAnio = new Date(fecha.getFullYear(), 0, 1);
  return Math.ceil((((fecha - inicioAnio) / 86400000) + inicioAnio.getDay() + 1) / 7);
}

// 2. Sugerir otro relevo disponible (rotando nombres sin pasar de 3 por semana)
document.getElementById("boton-sugerir").addEventListener("click", () => {
  const titular = document.getElementById("titular").value.trim().toLowerCase();
  const actual = document.getElementById("relevo").value.trim().toLowerCase();
  const fecha = document.getElementById("fecha").value;
  const semana = fecha ? obtenerSemana(fecha) : null;

  const opciones = presentadores.filter(p => {
    const enSemana = semana ? relevos.filter(r => r.relevo.toLowerCase() === p.toLowerCase() && obtenerSemana(r.fecha) === semana).length : 0;
    return p.toLowerCase() !== titular && p.toLowerCase() !== actual && enSemana < 3;
  });

  if (opciones.length > 0) {
    document.getElementById("relevo").value = opciones[Math.floor(Math.random() * opciones.length)];
  }
});

// 3. Dibujar alertas, contador con horas y bitacora ordenada
function mostrarTodo() {
  const lista = document.getElementById("lista-relevos");
  const contador = document.getElementById("contador-relevos");
  lista.innerHTML = "";
const filtro = (document.getElementById("buscador")?.value || "").toLowerCase();
  // Ordenar de la fecha mas reciente a la mas antigua
  relevos.sort((a, b) => b.fecha.localeCompare(a.fecha));

  // Alerta Nivel 2: pendientes de hoy y manana
  const hoy = new Date().toLocaleDateString("en-CA");
  const manana = new Date(Date.now() + 86400000).toLocaleDateString("en-CA");
  
  const pendientesUrgentes = relevos.filter(r => r.estado === "Pendiente" && (r.fecha === hoy || r.fecha === manana));

  if (pendientesUrgentes.length > 0) {
    lista.innerHTML += `<div style="background:#ffe6f0; border:2px solid #f4a6b8; border-radius:12px; padding:12px; margin-top:12px;">
      <b>Alerta urgente:</b> Hay <b>${pendientesUrgentes.length}</b> relevo(s) pendiente(s) para hoy o manana.
    </div>`;
  }

  let hechos = {};
  let cubiertos = {};
  let horas = {};

  relevos.forEach((r, i) => {
    if (filtro && !`${r.programa} ${r.titular} ${r.relevo} ${r.estado} ${r.fecha}`.toLowerCase().includes(filtro)) return;
    cubiertos[r.titular] = (cubiertos[r.titular] || 0) + 1;
    if (r.relevo && r.relevo !== "Sin asignar") {
      hechos[r.relevo] = (hechos[r.relevo] || 0) + 1;
      if (r.estado === "Cubierto") {
        horas[r.relevo] = (horas[r.relevo] || 0) + calcularHoras(r.inicio, r.fin);
      }
    }

    const claseEstado = r.estado === "Cubierto" ? "estado-cubierto" : (r.estado === "Sin cubrir" ? "estado-sin-cubrir" : "estado-pendiente");

    lista.innerHTML += `
      <div style="border:2px solid #d9ceff; border-left:5px solid #38CFC3; border-radius:12px; padding:14px; margin-top:14px; background:#faf8ff;">
        <strong style="color:#34205F; font-size:17px;">${r.programa}</strong> (${r.fecha} | ${r.inicio} - ${r.fin})<br>
        Titular: ${r.titular} | Relevo: ${r.relevo}<br>
        Estado: <span class="badge ${claseEstado}">${r.estado}</span> | Motivo: ${r.motivo}<br>
        Obs: ${r.obs}<br>
        <button onclick="cambiarEstado(${i})">Cambiar Estado</button>
        <button onclick="borrarRelevo(${i})">Eliminar</button>
      </div>`;
  });

  // Resumen del mes + contador por presentador
  const sinCubrir = relevos.filter(r => r.estado === "Sin cubrir" || r.estado === "Pendiente").length;
  const nombres = new Set([...Object.keys(hechos), ...Object.keys(cubiertos)]);

  contador.innerHTML = `<p><b>Resumen general:</b> ${relevos.length} relevos registrados | ${sinCubrir} pendientes o sin cubrir</p>` +
    ([...nombres].map(nombre =>
      `<p><b>${nombre}</b>: Hizo <b>${hechos[nombre] || 0}</b> relevos (${(horas[nombre] || 0).toFixed(1)} h) | Lo cubrieron <b>${cubiertos[nombre] || 0}</b> veces</p>`
    ).join("") || "<p>Sin registros aun</p>");
}

// 4. Validar reglas Nivel 1 + detectar choques de horario Nivel 3
document.getElementById("formulario-relevo").addEventListener("submit", (e) => {
  e.preventDefault();
  const fecha = document.getElementById("fecha").value;
  const programa = document.getElementById("programa").value.trim();
  const inicio = document.getElementById("hora-inicio").value;
  const fin = document.getElementById("hora-fin").value;
  const titular = document.getElementById("titular").value.trim();
  const relevo = document.getElementById("relevo").value.trim() || "Sin asignar";
  const estado = document.getElementById("estado").value;

  if (!fecha || !programa || !titular || !estado) return alert("Completa fecha, programa, titular y estado.");
  if (fin <= inicio) return alert("La hora de fin debe ser despues de la hora de inicio.");
  if (titular.toLowerCase() === relevo.toLowerCase()) return alert("El titular y el relevo no pueden ser la misma persona.");

  // Maximo 3 relevos en la misma semana
  const semanaNueva = obtenerSemana(fecha);
  const enMismaSemana = relevos.filter(r => r.relevo.toLowerCase() === relevo.toLowerCase() && obtenerSemana(r.fecha) === semanaNueva).length;
  if (relevo !== "Sin asignar" && enMismaSemana >= 3) return alert("Este presentador ya alcanzo el maximo de 3 relevos en esa semana.");

  // Nivel 3: Detectar choque de horario en la misma fecha
  const hayChoque = relevo !== "Sin asignar" && relevos.some(r =>
    r.fecha === fecha && r.relevo.toLowerCase() === relevo.toLowerCase() && (inicio < r.fin && fin > r.inicio)
  );
  if (hayChoque) return alert("Choque de horario: este presentador ya cubre otro programa a esa hora.");

  relevos.unshift({
    fecha, programa, inicio, fin, titular, relevo, estado,
    motivo: document.getElementById("motivo").value,
    obs: document.getElementById("observaciones").value.trim() || "Ninguna"
  });

  guardarDatos();
  mostrarTodo();
  e.target.reset();
});

// 5. Cambiar estado y borrar con confirmacion
function cambiarEstado(i) {
  const estados = ["Pendiente", "Cubierto", "Sin cubrir"];
  relevos[i].estado = estados[(estados.indexOf(relevos[i].estado) + 1) % 3];
  guardarDatos();
  mostrarTodo();
}

function borrarRelevo(i) {
  if (confirm("¿Segura que quieres eliminar este relevo?")) {
    relevos.splice(i, 1);
    guardarDatos();
    mostrarTodo();
  }
}

document.getElementById("boton-limpiar").addEventListener("click", () => {
  if (confirm("¿Segura que quieres borrar todos los datos de ejemplo?")) {
    relevos = [];
    guardarDatos();
    mostrarTodo();
  }
});

mostrarTodo();

// Nivel 2: Filtrar al escribir y exportar bitacora a archivo CSV
document.getElementById("buscador").addEventListener("input", mostrarTodo);

document.getElementById("boton-csv").addEventListener("click", () => {
  const filas = ["Fecha,Programa,Inicio,Fin,Titular,Relevo,Estado,Motivo,Observaciones",
    ...relevos.map(r => `${r.fecha},${r.programa},${r.inicio},${r.fin},${r.titular},${r.relevo},${r.estado},${r.motivo},${r.obs}`)
  ].join("\n");
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(new Blob([filas], { type: "text/csv" }));
  enlace.download = "bitacora_onda_viva.csv";
  enlace.click();
});

// Nivel 2: Administrar lista de presentadores desde la pagina
function mostrarPresentadores() {
  const caja = document.getElementById("lista-presentadores");
  caja.innerHTML = presentadores.map((p, i) =>
    `<span class="badge estado-cubierto" style="margin:6px 6px 0 0;">${p} <b onclick="quitarPresentador(${i})" style="cursor:pointer; margin-left:6px;">×</b></span>`
  ).join("");
}

document.getElementById("boton-agregar-pres").addEventListener("click", () => {
  const input = document.getElementById("nuevo-presentador");
  const nombre = input.value.trim();
  if (!nombre) return alert("Escribe un nombre primero.");
  if (presentadores.some(p => p.toLowerCase() === nombre.toLowerCase())) return alert("Ese presentador ya esta en la lista.");
  presentadores.push(nombre);
  localStorage.setItem("presentadores_onda", JSON.stringify(presentadores));
  input.value = "";
  mostrarPresentadores();
});

function quitarPresentador(i) {
  if (confirm(`¿Quitar a ${presentadores[i]} del equipo?`)) {
    presentadores.splice(i, 1);
    localStorage.setItem("presentadores_onda", JSON.stringify(presentadores));
    mostrarPresentadores();
  }
}

mostrarPresentadores();