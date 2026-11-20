/* ============================================================
   API.JS · Capa de datos de la plataforma
   · Con CONFIG.api vacío → MODO DEMO (localStorage, sin servidor)
   · Con CONFIG.api lleno  → Google Apps Script (code.gs) + Google Sheets
   Las dos modalidades implementan exactamente las mismas acciones.

   Modelo de accesos:
   · Estudiante  → entra con usuario y contraseña (base de datos)
   · Profesor    → cuenta creada por la dirección; gestiona SOLO su asignatura
   · Dirección   → rector / decano / secretaría con su clave; acceso total

   Novedades v3:
   · Tareas con envío al profesor (correo / WhatsApp) y registro de entregas
   · Exámenes con preguntas de unir columnas (emparejar) y redacción
     (la redacción NO se corrige automática: la revisa el profesor)
   · Foros de debate por asignatura (además del foro de dudas en vivo)
   · Promedios por estudiante y por asignatura
   · Importar una asignatura completa desde JSON (montaje en un paso)
   · Listar archivos de una carpeta (Drive) para añadir recursos con su ruta
   ============================================================ */
window.API = {
  get demo() { return !window.CONFIG.api; },
  async call(action, payload = {}) {
    if (this.demo) return window.DemoAPI.handle(action, payload);
    const res = await fetch(window.CONFIG.api, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload })
    });
    if (!res.ok) throw new Error('No se pudo conectar con el servidor (' + res.status + ')');
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || 'Error del servidor');
    return j.data;
  }
};

/* ---------- API DEMO (localStorage) ---------- */
window.DemoAPI = (() => {
  'use strict';
  const KEY = 'seminario.db.v1';
  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; }
  if (!db || !db.estudiantes || !db.tareas) { db = window.DEMO.db(); persist(); }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* almacenamiento lleno */ } }
  const uid = p => (p || 'id') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const now = () => new Date().toISOString();
  const C = () => window.CONFIG;
  /* orden aleatorio de la columna B para las preguntas de emparejar */
  function mezclarB(pares) {
    const b = (pares || []).map(x => x.b);
    for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
    return b;
  }

  /* -- helpers de negocio (idénticos a code.gs) -- */
  const err = m => { throw new Error(m); };
  const normTxt = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
  const estByU = u => db.estudiantes.find(e => e.usuario.toLowerCase() === String(u || '').toLowerCase());
  const profByU = u => db.profesores.find(p => p.usuario.toLowerCase() === String(u || '').toLowerCase());
  const asigById = id => db.asignaturas.find(a => a.id === id);
  const cuentaPalabras = t => String(t || '').trim().split(/\s+/).filter(Boolean).length;

  /* autenticación del personal: dirección por clave, profesor por cuenta */
  function staff(auth) {
    const a = auth || {};
    if (a.rol === 'dir') {
      const c = String(a.codigo || '').trim();
      for (const clave of Object.values(C().claves)) if (clave === c) return { nivel: 'dir' };
      err('Clave de dirección no válida.');
    }
    if (a.rol === 'prof') {
      const p = profByU(a.usuario);
      if (!p || p.clave !== a.clave) err('Credenciales de profesor incorrectas.');
      if (p.estado !== 'Activo') err('Cuenta de profesor inactiva. Consulta con la dirección.');
      return { nivel: 'prof', usuario: p.usuario };
    }
    err('Sesión no válida. Vuelve a entrar.');
  }
  const dir = auth => { const s = staff(auth); if (s.nivel !== 'dir') err('Esta acción es solo para la dirección.'); return s; };

  /* acceso a una asignatura: dirección siempre; profesor solo la suya */
  function accesoAsig(auth, asigId) {
    const s = staff(auth);
    const a = asigById(asigId);
    if (!a) err('Asignatura no encontrada.');
    if (s.nivel === 'dir') return { ...s, asig: a };
    if (a.profesor !== s.usuario) err('Solo puedes gestionar tu propia asignatura.');
    return { ...s, asig: a };
  }

  /* usuario y clave automáticos (sin títulos como «Prof.» o «Lic.») */
  const HONORIFICOS = ['prof', 'profra', 'dr', 'dra', 'lic', 'pastor', 'rev', 'rd'];
  function genUsuario(nombre) {
    const partes = normTxt(nombre).split('.').filter(Boolean).filter(p => !HONORIFICOS.includes(p));
    const base = (partes[0] || 'prof') + '.' + (partes[1] || 'seminario');
    let u = base, n = 2;
    const ocupado = x => db.profesores.some(p => p.usuario.toLowerCase() === x) || db.estudiantes.some(e => e.usuario.toLowerCase() === x);
    while (ocupado(u)) u = base + n++;
    return u;
  }
  function genClave() {
    const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
    let c = ''; for (let i = 0; i < 8; i++) c += abc[Math.floor(Math.random() * abc.length)];
    return c;
  }
  const cred = p => ({ nombre: p.nombre, usuario: p.usuario, clave: p.clave, email: p.email || '', whatsapp: p.whatsapp || '' });

  function verEst(u, p) { const e = estByU(u); if (!e || e.clave !== p) err('Usuario o contraseña incorrectos.'); if (e.estado !== 'Activo') err('Cuenta inactiva. Consulta con la secretaría.'); return e; }
  const visibles = arr => arr.filter(x => x.visible !== false);
  const ordena = arr => arr.slice().sort((a, b) => (+a.orden || 0) - (+b.orden || 0));
  function itemsDeAsig(aid) {
    return {
      p: visibles(ordena(db.pestanas.filter(x => x.asignaturaId === aid))),
      x: visibles(db.examenes.filter(x => x.asignaturaId === aid)),
      t: visibles(ordena(db.tareas.filter(x => x.asignaturaId === aid)))
    };
  }
  /* mejor nota final de un examen (auto + manual) por estudiante */
  function mejorNota(examenId, usuario) {
    const its = db.intentos.filter(x => x.examenId === examenId && x.usuario === usuario);
    if (!its.length) return null;
    const fin = it => (+it.auto || 0) + (+it.manual || 0);
    let m = its[0];
    its.forEach(it => { if (fin(it) > fin(m)) m = it; });
    return { auto: m.auto, manual: m.manual, final: fin(m), total: +m.total || 0, estado: m.estado, pct: +m.total ? Math.round(fin(m) / m.total * 100) : 0, n: its.length };
  }
  /* promedio de quizzes de un estudiante en la asignatura (los no hechos cuentan 0) */
  function promedioEst(aid, usuario) {
    const xs = visibles(db.examenes.filter(x => x.asignaturaId === aid));
    if (!xs.length) return { pct: null, conNota: 0, tot: 0 };
    let suma = 0, conNota = 0;
    const detalle = {};
    xs.forEach(x => { const n = mejorNota(x.id, usuario); if (n && +n.total) { const d = n.pct; detalle[x.id] = d; suma += d; conNota++; } });
    return { pct: Math.round(suma / xs.length), conNota, tot: xs.length, detalle };
  }
  function progresoEst(aid, usuario) {
    const it = itemsDeAsig(aid), pg = db.progreso.filter(x => x.asignaturaId === aid && x.usuario === usuario);
    const dP = pg.filter(x => x.tipo === 'pestaña' && x.completado).map(x => x.itemId);
    const dX = new Set(pg.filter(x => x.tipo === 'examen' && x.completado).map(x => x.itemId));
    const dT = new Set(pg.filter(x => x.tipo === 'tarea' && x.completado).map(x => x.itemId));
    const tot = it.p.length + it.x.length + it.t.length;
    const done = it.p.filter(x => dP.includes(x.id)).length + it.x.filter(x => dX.has(x.id)).length + it.t.filter(x => dT.has(x.id)).length;
    return { done, tot, pct: tot ? Math.round(done / tot * 100) : 0 };
  }

  /* ---------- calificación automática de un intento ---------- */
  function corregirIntento(ex, respuestas) {
    const qs = db.preguntas.filter(q => q.examenId === ex.id).sort((a, b) => a.orden - b.orden);
    let auto = 0, total = 0;
    const redacciones = [];
    const detalle = qs.map((q, i) => {
      const pts = +q.puntos || 1;
      total += pts;
      const r = (respuestas || [])[i];
      if (q.tipo === 'red') {
        redacciones.push({ i, texto: String(r || ''), puntos: null });
        return { texto: q.texto, tipo: 'red', ok: null, puntos: pts };
      }
      if (q.tipo === 'emp') {
        const pares = JSON.parse(q.pares || '[]');
        const opciones = JSON.parse(q.opciones || '[]');
        const correcta = JSON.parse(q.correcta || '[]');
        const elec = Array.isArray(r) ? r : [];
        const porPar = pares.length ? pts / pares.length : 0;
        let aciertos = 0;
        pares.forEach((_, j) => { if (elec[j] != null && +elec[j] === +correcta[j]) aciertos++; });
        const pts2 = +(porPar * aciertos).toFixed(2);
        auto += pts2;
        return { texto: q.texto, tipo: 'emp', ok: aciertos === pares.length, aciertos, de: pares.length, puntos: pts, puntos2: pts2 };
      }
      const ok = r != null && +r === +q.correcta;
      if (ok) auto += pts;
      return { texto: q.texto, tipo: q.tipo, ok, eleccion: r, correcta: +q.correcta, opciones: JSON.parse(q.opciones || '[]') };
    });
    auto = +auto.toFixed(2);
    const conRed = redacciones.length > 0;
    return { auto, total, detalle, redacciones, estado: conRed ? 'Pendiente de revisión' : 'Calificado', conRed };
  }

  /* -- router de acciones -- */
  async function handle(action, p) {
    switch (action) {
      case 'ping': return { ok: true, modo: 'demo' };

      /* ----- sesiones ----- */
      case 'login': {
        const e = verEst(p.u, p.p);
        return { nombre: e.nombre, grupo: e.grupo, usuario: e.usuario };
      }
      case 'loginProfesor': {
        const pr = profByU(p.u);
        if (!pr || pr.clave !== p.p) err('Usuario o contraseña incorrectos.');
        if (pr.estado !== 'Activo') err('Cuenta inactiva. Consulta con la dirección.');
        return { nombre: pr.nombre, usuario: pr.usuario };
      }
      case 'loginStaff': {
        const c = String(p.codigo || '').trim();
        for (const [rol, clave] of Object.entries(C().claves)) if (clave === c)
          return { rol, nombre: { rector: 'Rectoría', decano: 'Decanato', secretaria: 'Secretaría' }[rol] };
        err('Clave de acceso no válida.');
      }

      /* ----- base de estudiantes (lectura: personal; escritura: dirección) ----- */
      case 'getEstudiantes': staff(p.auth); return db.estudiantes.map(e => ({ ...e }));
      case 'saveEstudiante': {
        dir(p.auth);
        const e = p.est;
        if (!e.nombre || !e.usuario) err('Nombre y usuario son obligatorios.');
        const dup = db.estudiantes.find(x => x.usuario.toLowerCase() === e.usuario.toLowerCase() && x.id !== e.id);
        if (dup) err('Ya existe un estudiante con ese usuario.');
        if (e.id) {
          const i = db.estudiantes.findIndex(x => x.id === e.id);
          if (i < 0) err('Estudiante no encontrado.');
          db.estudiantes[i] = { ...db.estudiantes[i], ...e };
        } else {
          if (!e.clave) err('El estudiante nuevo necesita contraseña.');
          db.estudiantes.push({ id: uid('e'), nombre: e.nombre, grupo: e.grupo || '1.er año', usuario: e.usuario, clave: e.clave, estado: e.estado || 'Activo' });
        }
        persist(); return { ok: true };
      }
      case 'deleteEstudiante': {
        dir(p.auth);
        const viejo = db.estudiantes.find(x => x.id === p.id);
        db.estudiantes = db.estudiantes.filter(x => x.id !== p.id);
        if (viejo) db.matriculas = db.matriculas.filter(x => x.usuario !== viejo.usuario);
        persist(); return { ok: true };
      }
      case 'importarEstudiantes': {
        dir(p.auth);
        let nuevos = 0, actualizados = 0;
        String(p.texto || '').split(/\r?\n/).forEach(linea => {
          const c = linea.trim(); if (!c) return;
          const v = c.split(/[;,\t]/).map(x => x.trim());
          if (!v[0] || /nombre/i.test(v[0]) && !v[1]) return;
          const [nombre, grupo, usuario, clave, estado] = v;
          if (!nombre || !usuario || !clave) return;
          const ex = estByU(usuario);
          if (ex) { ex.nombre = nombre; ex.grupo = grupo || ex.grupo; ex.clave = clave; ex.estado = estado || ex.estado || 'Activo'; actualizados++; }
          else { db.estudiantes.push({ id: uid('e'), nombre, grupo: grupo || 'Sin grupo', usuario, clave, estado: estado || 'Activo' }); nuevos++; }
        });
        persist(); return { nuevos, actualizados };
      }

      /* ----- profesores (dirección) ----- */
      case 'getProfesores': dir(p.auth); return db.profesores.map(x => ({ ...x }));
      case 'saveProfesor': {
        dir(p.auth);
        const q = p.prof;
        if (!q.nombre) err('El profesor necesita un nombre.');
        let credNueva = null;
        if (q.id) {
          const i = db.profesores.findIndex(x => x.id === q.id);
          if (i < 0) err('Profesor no encontrado.');
          db.profesores[i] = { ...db.profesores[i], nombre: q.nombre, email: q.email ?? db.profesores[i].email, whatsapp: q.whatsapp ?? db.profesores[i].whatsapp, estado: q.estado || db.profesores[i].estado };
          if (q.clave) { db.profesores[i].clave = q.clave; credNueva = cred(db.profesores[i]); }
        } else {
          const np = { id: uid('pr'), nombre: q.nombre, email: q.email || '', whatsapp: q.whatsapp || '', estado: 'Activo', creado: now(), usuario: q.usuario || genUsuario(q.nombre), clave: q.clave || genClave() };
          db.profesores.push(np); credNueva = cred(np);
        }
        persist(); return { ok: true, credenciales: credNueva };
      }
      case 'resetClaveProfesor': {
        dir(p.auth);
        const pr = profByU(p.usuario); if (!pr) err('Profesor no encontrado.');
        pr.clave = genClave(); persist(); return { credenciales: cred(pr) };
      }
      case 'deleteProfesor': {
        dir(p.auth);
        db.profesores = db.profesores.filter(x => x.usuario !== p.usuario);
        db.asignaturas.forEach(a => { if (a.profesor === p.usuario) { a.profesor = ''; a.profesorNombre = ''; } });
        persist(); return { ok: true };
      }

      /* ----- asignaturas ----- */
      case 'getAsignaturas': {
        const s = p.sesion || {};
        if (s.rol === 'estudiante') {
          const mias = db.matriculas.filter(m => m.usuario === s.usuario).map(m => m.asignaturaId);
          return db.asignaturas.filter(a => mias.includes(a.id));
        }
        if (s.rol === 'profesor') return db.asignaturas.filter(a => a.profesor === s.usuario);
        return db.asignaturas; // rectoría / decanato / secretaría → todas
      }
      case 'saveAsignatura': {
        const s = staff(p.auth);
        const a = p.asig;
        if (!a.nombre) err('La asignatura necesita un nombre.');
        let credNueva = null;
        if (a.id) {
          const i = db.asignaturas.findIndex(x => x.id === a.id);
          if (i < 0) err('Asignatura no encontrada.');
          const cur = db.asignaturas[i];
          if (s.nivel === 'prof') {
            if (cur.profesor !== s.usuario) err('Solo puedes gestionar tu propia asignatura.');
            cur.nombre = a.nombre; cur.descripcion = a.descripcion ?? cur.descripcion; cur.color = a.color || cur.color;
          } else {
            db.asignaturas[i] = { ...cur, ...a };
          }
        } else {
          if (s.nivel !== 'dir') err('Solo la dirección puede crear asignaturas.');
          /* profesor: existente, nuevo (se crean sus credenciales) o sin asignar */
          let profUsuario = '', profNombre = '';
          if (a.profesorUsuario === '__nuevo__') {
            const q = a.profesorNuevo || {};
            if (!q.nombre) err('Escribe el nombre del nuevo profesor.');
            const np = { id: uid('pr'), nombre: q.nombre, email: q.email || '', whatsapp: q.whatsapp || '', estado: 'Activo', creado: now(), usuario: genUsuario(q.nombre), clave: genClave() };
            db.profesores.push(np); credNueva = cred(np);
            profUsuario = np.usuario; profNombre = np.nombre;
          } else if (a.profesorUsuario) {
            const pr = profByU(a.profesorUsuario);
            if (!pr) err('Profesor no encontrado.');
            profUsuario = pr.usuario; profNombre = pr.nombre;
          }
          const na = {
            id: uid('asig'), nombre: a.nombre, descripcion: a.descripcion || '', color: a.color || C().tema.navy,
            profesor: profUsuario, profesorNombre: profNombre, profEmail: a.profEmail || (profUsuario ? (profByU(profUsuario) || {}).email || '' : ''),
            profWa: a.profWa || (profUsuario ? (profByU(profUsuario) || {}).whatsapp || '' : ''),
            carpeta: a.carpeta || '', chatAbierto: 'No', creada: now()
          };
          db.asignaturas.push(na);
          (a.grupos || []).forEach(g => db.estudiantes.filter(e => e.grupo === g).forEach(e => {
            if (!db.matriculas.some(m => m.asignaturaId === na.id && m.usuario === e.usuario))
              db.matriculas.push({ id: uid('m'), asignaturaId: na.id, usuario: e.usuario, grupo: e.grupo, fecha: now() });
          }));
        }
        persist(); return { ok: true, credenciales: credNueva };
      }
      case 'setProfesorAsignatura': {
        dir(p.auth);
        const a = asigById(p.asigId); if (!a) err('Asignatura no encontrada.');
        let credNueva = null;
        if (p.modo === 'nuevo') {
          if (!p.nombre) err('Escribe el nombre del nuevo profesor.');
          const np = { id: uid('pr'), nombre: p.nombre, email: p.email || '', whatsapp: p.whatsapp || '', estado: 'Activo', creado: now(), usuario: genUsuario(p.nombre), clave: genClave() };
          db.profesores.push(np); credNueva = cred(np);
          a.profesor = np.usuario; a.profesorNombre = np.nombre;
          a.profEmail = np.email; a.profWa = np.whatsapp;
        } else {
          const pr = profByU(p.usuario); if (!pr) err('Profesor no encontrado.');
          a.profesor = pr.usuario; a.profesorNombre = pr.nombre;
          a.profEmail = pr.email || ''; a.profWa = pr.whatsapp || '';
        }
        persist(); return { ok: true, credenciales: credNueva };
      }
      case 'deleteAsignatura': {
        dir(p.auth);
        db.asignaturas = db.asignaturas.filter(x => x.id !== p.id);
        db.matriculas = db.matriculas.filter(x => x.asignaturaId !== p.id);
        const xs = db.examenes.filter(x => x.asignaturaId === p.id).map(x => x.id);
        db.examenes = db.examenes.filter(x => x.asignaturaId !== p.id);
        db.preguntas = db.preguntas.filter(x => !xs.includes(x.examenId));
        db.intentos = db.intentos.filter(x => !xs.includes(x.examenId));
        db.pestanas = db.pestanas.filter(x => x.asignaturaId !== p.id);
        db.progreso = db.progreso.filter(x => x.asignaturaId !== p.id);
        db.tareas = db.tareas.filter(x => x.asignaturaId !== p.id);
        db.tareaEntregas = db.tareaEntregas.filter(x => x.asignaturaId !== p.id);
        db.anuncios = db.anuncios.filter(x => x.asignaturaId !== p.id);
        db.chat = (db.chat || []).filter(x => x.asignaturaId !== p.id);
        const fs2 = db.foros.filter(x => x.asignaturaId === p.id).map(x => x.id);
        db.foros = db.foros.filter(x => x.asignaturaId !== p.id);
        db.foroPosts = db.foroPosts.filter(x => !fs2.includes(x.foroId));
        persist(); return { ok: true };
      }

      /* ----- montaje en un paso: importar asignatura desde JSON ----- */
      case 'importarAsignatura': {
        const s = staff(p.auth);
        const d = p.datos || {};
        const a = d.asignatura || {};
        if (!a.nombre) err('El JSON no incluye el nombre de la asignatura.');
        if (p.asigId) {
          /* añadir el contenido a una asignatura existente (profesor o dirección) */
          const cur = accesoAsig(p.auth, p.asigId).asig;
          if (a.carpeta) cur.carpeta = a.carpeta;
          if (a.profEmail && s.nivel === 'dir') cur.profEmail = a.profEmail;
          if (a.profWa && s.nivel === 'dir') cur.profWa = a.profWa;
          volcarContenido_(cur.id, d);
          persist(); return { ok: true, id: cur.id };
        }
        if (s.nivel !== 'dir') err('Solo la dirección puede crear asignaturas.');
        let profUsuario = '', profNombre = '';
        if (a.profesorUsuario === '__nuevo__') {
          const q = a.profesorNuevo || {};
          if (!q.nombre) err('Escribe el nombre del nuevo profesor.');
          const np = { id: uid('pr'), nombre: q.nombre, email: a.profEmail || q.email || '', whatsapp: a.profWa || q.whatsapp || '', estado: 'Activo', creado: now(), usuario: genUsuario(q.nombre), clave: genClave() };
          db.profesores.push(np); profUsuario = np.usuario; profNombre = np.nombre;
        } else if (a.profesorUsuario) {
          const pr = profByU(a.profesorUsuario);
          if (!pr) err('Profesor no encontrado.');
          profUsuario = pr.usuario; profNombre = pr.nombre;
        }
        const na = {
          id: uid('asig'), nombre: a.nombre, descripcion: a.descripcion || '', color: a.color || C().tema.navy,
          profesor: profUsuario, profesorNombre: profNombre, profEmail: a.profEmail || '', profWa: a.profWa || '',
          carpeta: a.carpeta || '', chatAbierto: 'No', creada: now()
        };
        db.asignaturas.push(na);
        (a.matricularGrupos || []).forEach(g => db.estudiantes.filter(e => e.grupo === g).forEach(e => {
          if (!db.matriculas.some(m => m.asignaturaId === na.id && m.usuario === e.usuario))
            db.matriculas.push({ id: uid('m'), asignaturaId: na.id, usuario: e.usuario, grupo: e.grupo, fecha: now() });
        }));
        volcarContenido_(na.id, d);
        persist();
        return { ok: true, id: na.id, profesor: profNombre || null, usuario: profUsuario || null };
      }

      /* ----- carpeta de Drive: listar archivos para añadir recursos ----- */
      case 'listarCarpeta': {
        accesoAsig(p.auth, p.asigId);
        const ruta = String(p.carpeta || '').trim();
        if (!ruta) err('Escribe la carpeta (ID o enlace de Drive, o ruta local).');
        return window.CARPETA_DEMO.listar(ruta);
      }

      /* ----- matrícula ----- */
      case 'getMatriculados': {
        accesoAsig(p.auth, p.asigId);
        const us = db.matriculas.filter(m => m.asignaturaId === p.asigId).map(m => m.usuario);
        return db.estudiantes.filter(e => us.includes(e.usuario));
      }
      case 'matricular': {
        accesoAsig(p.auth, p.asigId);
        let n = 0;
        (p.usuarios || []).forEach(u => {
          const e = estByU(u); if (!e) return;
          if (!db.matriculas.some(m => m.asignaturaId === p.asigId && m.usuario === e.usuario)) {
            db.matriculas.push({ id: uid('m'), asignaturaId: p.asigId, usuario: e.usuario, grupo: e.grupo, fecha: now() }); n++;
          }
        });
        persist(); return { n };
      }
      case 'matricularGrupo': {
        accesoAsig(p.auth, p.asigId);
        let n = 0;
        db.estudiantes.filter(e => e.grupo === p.grupo).forEach(e => {
          if (!db.matriculas.some(m => m.asignaturaId === p.asigId && m.usuario === e.usuario)) {
            db.matriculas.push({ id: uid('m'), asignaturaId: p.asigId, usuario: e.usuario, grupo: e.grupo, fecha: now() }); n++;
          }
        });
        persist(); return { n };
      }
      case 'desmatricular': {
        accesoAsig(p.auth, p.asigId);
        db.matriculas = db.matriculas.filter(m => !(m.asignaturaId === p.asigId && m.usuario === p.usuario));
        persist(); return { ok: true };
      }

      /* ----- módulos (pestañas) ----- */
      case 'getPestanas': {
        let arr = ordena(db.pestanas.filter(x => x.asignaturaId === p.asigId));
        if (!p.todas) arr = visibles(arr);
        return arr;
      }
      case 'savePestana': {
        accesoAsig(p.auth, p.pesta?.asignaturaId);
        const t = p.pesta;
        if (!t.asignaturaId) err('Falta la asignatura.');
        if (t.id) {
          const i = db.pestanas.findIndex(x => x.id === t.id);
          if (i < 0) err('Módulo no encontrado.');
          db.pestanas[i] = { ...db.pestanas[i], ...t };
        } else {
          const orden = Math.max(0, ...db.pestanas.filter(x => x.asignaturaId === t.asignaturaId).map(x => x.orden)) + 1;
          db.pestanas.push({ id: uid('p'), asignaturaId: t.asignaturaId, titulo: t.titulo || 'Nuevo módulo', icono: t.icono || 'fa-book', tipo: t.tipo || 'contenido', contenido: t.contenido || '', orden, visible: t.visible !== false });
        }
        persist(); return { ok: true };
      }
      case 'deletePestana': {
        accesoAsig(p.auth, p.asigId);
        db.pestanas = db.pestanas.filter(x => x.id !== p.id);
        db.progreso = db.progreso.filter(x => !(x.tipo === 'pestaña' && x.itemId === p.id));
        persist(); return { ok: true };
      }
      case 'moverPestana': {
        accesoAsig(p.auth, p.asigId);
        const t = db.pestanas.find(x => x.id === p.id); if (!t) err('Módulo no encontrado.');
        const her = ordena(db.pestanas.filter(x => x.asignaturaId === t.asignaturaId));
        const i = her.findIndex(x => x.id === p.id), j = i + (p.dir === 'up' ? -1 : 1);
        if (j >= 0 && j < her.length) { [her[i].orden, her[j].orden] = [her[j].orden, her[i].orden]; }
        persist(); return { ok: true };
      }

      /* ----- exámenes ----- */
      case 'getExamenes': {
        let arr = db.examenes.filter(x => x.asignaturaId === p.asigId);
        if (!p.todas) arr = visibles(arr);
        return arr.map(e => ({ ...e, nPreg: db.preguntas.filter(q => q.examenId === e.id).length, nRed: db.preguntas.filter(q => q.examenId === e.id && q.tipo === 'red').length }));
      }
      case 'getExamen': {
        const e = db.examenes.find(x => x.id === p.id); if (!e) err('Examen no encontrado.');
        const preguntas = db.preguntas.filter(q => q.examenId === p.id).sort((a, b) => a.orden - b.orden)
          .map(q => ({ ...q, opciones: JSON.parse(q.opciones || '[]'), pares: JSON.parse(q.pares || '[]'), correcta: q.tipo === 'emp' ? JSON.parse(q.correcta || '[]') : +q.correcta || 0 }));
        return { ...e, preguntas };
      }
      case 'saveExamen': {
        accesoAsig(p.auth, p.examen?.asignaturaId);
        const e = p.examen, qs = e.preguntas || [];
        if (!e.titulo) err('El examen necesita un título.');
        let id = e.id;
        if (id) {
          const i = db.examenes.findIndex(x => x.id === id);
          if (i < 0) err('Examen no encontrado.');
          db.examenes[i] = { ...db.examenes[i], titulo: e.titulo, descripcion: e.descripcion || '', visible: e.visible !== false };
        } else {
          id = uid('x');
          db.examenes.push({ id, asignaturaId: e.asignaturaId, titulo: e.titulo, descripcion: e.descripcion || '', visible: e.visible !== false, creado: now() });
        }
        db.preguntas = db.preguntas.filter(q => q.examenId !== id);
        qs.forEach((q, k) => db.preguntas.push({
          id: uid('q'), examenId: id, tipo: q.tipo || 'sm', texto: q.texto || '',
          opciones: JSON.stringify(q.tipo === 'vf' ? ['Verdadero', 'Falso'] : (q.tipo === 'emp' ? (q.opciones || mezclarB(q.pares)) : (q.opciones || ['', '', '', '']))),
          pares: q.tipo === 'emp' ? JSON.stringify(q.pares || []) : '',
          correcta: q.tipo === 'emp' ? JSON.stringify((q.pares || []).map(pa => (q.opciones || mezclarB(q.pares)).indexOf(pa.b))) : (q.correcta | 0),
          puntos: +q.puntos || 1, orden: k + 1
        }));
        persist(); return { id };
      }
      case 'deleteExamen': {
        accesoAsig(p.auth, p.asigId);
        db.examenes = db.examenes.filter(x => x.id !== p.id);
        db.preguntas = db.preguntas.filter(q => q.examenId !== p.id);
        db.intentos = db.intentos.filter(x => x.examenId !== p.id);
        db.progreso = db.progreso.filter(x => !(x.tipo === 'examen' && x.itemId === p.id));
        persist(); return { ok: true };
      }

      /* ----- intentos y calificación ----- */
      case 'enviarIntento': {
        const e = verEst(p.usuario, p.clave);
        const ex = db.examenes.find(x => x.id === p.examenId); if (!ex) err('Examen no encontrado.');
        const r = corregirIntento(ex, p.respuestas);
        const it = {
          id: uid('i'), examenId: ex.id, asignaturaId: ex.asignaturaId, usuario: e.usuario, nombre: e.nombre, fecha: now(),
          auto: r.auto, manual: null, total: r.total, estado: r.estado,
          respuestas: JSON.stringify(p.respuestas || []), redacciones: JSON.stringify(r.redacciones)
        };
        db.intentos.push(it);
        if (!db.progreso.some(x => x.asignaturaId === ex.asignaturaId && x.usuario === e.usuario && x.tipo === 'examen' && x.itemId === ex.id))
          db.progreso.push({ id: uid('g'), asignaturaId: ex.asignaturaId, usuario: e.usuario, nombre: e.nombre, tipo: 'examen', itemId: ex.id, completado: true, fecha: now() });
        persist();
        return { puntaje: r.auto, total: r.total, pct: r.total ? Math.round(r.auto / r.total * 100) : 0, estado: r.estado, detalle: r.detalle, redacciones: r.redacciones.length };
      }
      case 'getIntentos': {
        accesoAsig(p.auth, db.examenes.find(x => x.id === p.examenId)?.asignaturaId);
        return db.intentos.filter(x => x.examenId === p.examenId)
          .map(x => ({ id: x.id, examenId: x.examenId, usuario: x.usuario, nombre: x.nombre, fecha: x.fecha, auto: +x.auto || 0, manual: x.manual, total: +x.total || 0, estado: x.estado }));
      }
      case 'getIntentosAsig': {
        accesoAsig(p.auth, p.asigId);
        const xs = db.examenes.filter(x => x.asignaturaId === p.asigId).map(x => x.id);
        return db.intentos.filter(x => xs.includes(x.examenId))
          .map(x => ({ id: x.id, examenId: x.examenId, usuario: x.usuario, nombre: x.nombre, fecha: x.fecha, auto: +x.auto || 0, manual: x.manual, total: +x.total || 0, estado: x.estado }));
      }
      case 'getIntentoDetalle': {
        const itPre = db.intentos.find(x => x.id === p.id);
        accesoAsig(p.auth, itPre ? (itPre.asignaturaId || db.examenes.find(x => x.id === itPre.examenId)?.asignaturaId) : null);
        const it = db.intentos.find(x => x.id === p.id); if (!it) err('Intento no encontrado.');
        const ex = db.examenes.find(x => x.id === it.examenId);
        const qs = db.preguntas.filter(q => q.examenId === it.examenId).sort((a, b) => a.orden - b.orden)
          .map(q => ({ ...q, opciones: JSON.parse(q.opciones || '[]'), pares: JSON.parse(q.pares || '[]'), correcta: q.tipo === 'emp' ? JSON.parse(q.correcta || '[]') : +q.correcta || 0 }));
        return { intento: { ...it, respuestas: JSON.parse(it.respuestas || '[]'), redacciones: JSON.parse(it.redacciones || '[]') }, examen: { id: ex.id, titulo: ex.titulo }, preguntas: qs };
      }
      case 'calificarIntento': {
        const st = accesoAsig(p.auth, p.asigId);
        const it = db.intentos.find(x => x.id === p.id); if (!it) err('Intento no encontrado.');
        const qs = db.preguntas.filter(q => q.examenId === it.examenId && q.tipo === 'red').sort((a, b) => a.orden - b.orden);
        const reds = JSON.parse(it.redacciones || '[]');
        const manuales = p.manuales || [];
        let manual = 0;
        /* los manuales llegan en el mismo orden que las preguntas de redacción */
        qs.forEach((q, k) => { const v = +manuales[k]; if (!isNaN(v)) { const r = reds.find(x => x.i === q.orden - 1); if (r) r.puntos = Math.max(0, Math.min(v, +q.puntos)); manual += r.puntos || 0; } });
        it.manual = +manual.toFixed(2);
        it.redacciones = JSON.stringify(reds);
        it.estado = 'Calificado';
        persist();
        return { ok: true, auto: it.auto, manual: it.manual, final: +((+it.auto || 0) + it.manual).toFixed(2), total: +it.total };
      }

      /* ----- progreso y promedios ----- */
      case 'getProgreso': {
        if (p.usuario) return db.progreso.filter(x => x.asignaturaId === p.asigId && x.usuario === p.usuario);
        accesoAsig(p.auth, p.asigId);
        return db.progreso.filter(x => x.asignaturaId === p.asigId);
      }
      case 'setProgreso': {
        const e = verEst(p.usuario, p.clave);
        const i = db.progreso.findIndex(x => x.asignaturaId === p.asigId && x.usuario === e.usuario && x.tipo === p.tipo && x.itemId === p.itemId);
        if (i >= 0) db.progreso[i].completado = !!p.completado, db.progreso[i].fecha = now();
        else db.progreso.push({ id: uid('g'), asignaturaId: p.asigId, usuario: e.usuario, nombre: e.nombre, tipo: p.tipo, itemId: p.itemId, completado: !!p.completado, fecha: now() });
        persist(); return { ok: true };
      }
      case 'getMisNotas': {
        const e = verEst(p.usuario, p.clave);
        return db.intentos.filter(x => x.usuario === e.usuario && db.examenes.some(ex => ex.id === x.examenId && ex.asignaturaId === p.asigId))
          .map(x => ({ examenId: x.examenId, auto: x.auto, manual: x.manual, puntaje: (+x.auto || 0) + (+x.manual || 0), total: x.total, estado: x.estado, fecha: x.fecha }));
      }
      case 'getMisPromedio': {
        const e = verEst(p.usuario, p.clave);
        const pr = promedioEst(p.asigId, e.usuario);
        const pg = progresoEst(p.asigId, e.usuario);
        return { ...pr, progreso: pg };
      }
      case 'getPromedios': {
        accesoAsig(p.auth, p.asigId);
        return db.matriculas.filter(m => m.asignaturaId === p.asigId).map(m => {
          const pr = promedioEst(p.asigId, m.usuario);
          const pg = progresoEst(p.asigId, m.usuario);
          return { usuario: m.usuario, nombre: (db.estudiantes.find(e => e.usuario === m.usuario) || {}).nombre || m.usuario, grupo: m.grupo, promedio: pr.pct, conNota: pr.conNota, tot: pr.tot, detalle: pr.detalle, progreso: pg.pct };
        });
      }

      /* ----- tareas ----- */
      case 'getTareas': {
        let arr = ordena(db.tareas.filter(x => x.asignaturaId === p.asigId));
        if (!p.todas) arr = visibles(arr);
        return arr;
      }
      case 'saveTarea': {
        accesoAsig(p.auth, p.tarea?.asignaturaId);
        const t = p.tarea;
        if (!t.titulo) err('La tarea necesita un título.');
        if (t.id) {
          const i = db.tareas.findIndex(x => x.id === t.id);
          if (i < 0) err('Tarea no encontrada.');
          db.tareas[i] = { ...db.tareas[i], ...t };
        } else {
          const orden = Math.max(0, ...db.tareas.filter(x => x.asignaturaId === t.asignaturaId).map(x => x.orden)) + 1;
          db.tareas.push({ id: uid('t'), asignaturaId: t.asignaturaId, titulo: t.titulo, instrucciones: t.instrucciones || '', formato: t.formato || '', vence: t.vence || '', visible: t.visible !== false, orden, creado: now() });
        }
        persist(); return { ok: true };
      }
      case 'deleteTarea': {
        accesoAsig(p.auth, p.asigId);
        db.tareas = db.tareas.filter(x => x.id !== p.id);
        db.tareaEntregas = db.tareaEntregas.filter(x => x.tareaId !== p.id);
        db.progreso = db.progreso.filter(x => !(x.tipo === 'tarea' && x.itemId === p.id));
        persist(); return { ok: true };
      }
      case 'marcarTareaEnviada': {
        const e = verEst(p.usuario, p.clave);
        const t = db.tareas.find(x => x.id === p.tareaId); if (!t) err('Tarea no encontrada.');
        const medio = String(p.medio || 'correo');
        const i = db.tareaEntregas.findIndex(x => x.tareaId === t.id && x.usuario === e.usuario);
        if (i >= 0) db.tareaEntregas[i] = { ...db.tareaEntregas[i], medio, fecha: now() };
        else db.tareaEntregas.push({ id: uid('te'), tareaId: t.id, asignaturaId: t.asignaturaId, usuario: e.usuario, nombre: e.nombre, medio, fecha: now() });
        if (!db.progreso.some(x => x.asignaturaId === t.asignaturaId && x.usuario === e.usuario && x.tipo === 'tarea' && x.itemId === t.id))
          db.progreso.push({ id: uid('g'), asignaturaId: t.asignaturaId, usuario: e.usuario, nombre: e.nombre, tipo: 'tarea', itemId: t.id, completado: true, fecha: now() });
        persist(); return { ok: true };
      }
      case 'getTareaEntregasAsig': {
        accesoAsig(p.auth, p.asigId);
        return db.tareaEntregas.filter(x => x.asignaturaId === p.asigId).map(x => ({ ...x }));
      }

      /* ----- anuncios ----- */
      case 'getAnuncios': {
        return db.anuncios.filter(a => a.asignaturaId === p.asigId).sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || (b.fecha > a.fecha ? 1 : -1));
      }
      case 'saveAnuncio': {
        const s = accesoAsig(p.auth, p.anuncio?.asignaturaId);
        const a = p.anuncio;
        if (!a.titulo || !a.cuerpo) err('El anuncio necesita título y texto.');
        const autor = s.nivel === 'dir' ? 'Dirección' : s.asig.profesorNombre || 'Profesor';
        if (a.id) {
          const i = db.anuncios.findIndex(x => x.id === a.id);
          if (i < 0) err('Anuncio no encontrado.');
          db.anuncios[i] = { ...db.anuncios[i], ...a };
        } else {
          db.anuncios.push({ id: uid('a'), asignaturaId: a.asignaturaId, titulo: a.titulo, cuerpo: a.cuerpo, tag: a.tag || 'Aviso', autor, fecha: now(), pin: !!a.pin });
        }
        persist(); return { ok: true };
      }
      case 'deleteAnuncio': {
        const an = db.anuncios.find(x => x.id === p.id); if (!an) err('Anuncio no encontrado.');
        accesoAsig(p.auth, an.asignaturaId);
        db.anuncios = db.anuncios.filter(x => x.id !== p.id); persist(); return { ok: true };
      }

      /* ----- foro de dudas (chat en vivo) ----- */
      case 'getChat': {
        const s = p.sesion || {};
        const a = asigById(p.asigId); if (!a) err('Asignatura no encontrada.');
        if (s.rol === 'estudiante' && !db.matriculas.some(m => m.asignaturaId === p.asigId && m.usuario === s.usuario)) err('No estás matriculado en esta asignatura.');
        const todos = (db.chat || []).filter(c => c.asignaturaId === p.asigId).sort((x, y) => x.fecha < y.fecha ? -1 : 1);
        const desde = p.desde ? todos.filter(c => c.fecha > p.desde) : todos.slice(-120);
        return { abierto: a.chatAbierto === 'Si', mensajes: desde.map(c => ({ id: c.id, usuario: c.usuario, nombre: c.nombre, rol: c.rol, texto: c.texto, fecha: c.fecha })) };
      }
      case 'enviarChat': {
        const s = p.sesion || {};
        const a = asigById(p.asigId); if (!a) err('Asignatura no encontrada.');
        const texto = String(p.texto || '').trim().slice(0, 1000);
        if (!texto) err('Escribe un mensaje.');
        let nombre, usuario, rolR;
        if (s.rol === 'estudiante') {
          const e = verEst(s.usuario, s.clave);
          if (!db.matriculas.some(m => m.asignaturaId === p.asigId && m.usuario === e.usuario)) err('No estás matriculado en esta asignatura.');
          if (a.chatAbierto !== 'Si') err('El foro está cerrado. Tu profesor lo abrirá cuando corresponda.');
          nombre = e.nombre; usuario = e.usuario; rolR = 'estudiante';
        } else {
          const st = accesoAsig(p.auth, p.asigId);
          nombre = st.nivel === 'dir' ? 'Dirección' : (a.profesorNombre || 'Profesor');
          usuario = st.nivel === 'dir' ? 'direccion' : st.usuario; rolR = st.nivel === 'dir' ? 'direccion' : 'profesor';
        }
        const m = { id: uid('c'), asignaturaId: p.asigId, usuario, nombre, rol: rolR, texto, fecha: now() };
        (db.chat = db.chat || []).push(m); persist();
        return { mensaje: { id: m.id, usuario, nombre, rol: rolR, texto, fecha: m.fecha } };
      }
      case 'eliminarMensaje': {
        const s = p.sesion || {};
        const chat = (db.chat || []).find(c => c.id === p.id); if (!chat) err('Mensaje no encontrado.');
        if (s.rol === 'estudiante') {
          if (chat.usuario !== s.usuario) err('Solo puedes eliminar tus propios mensajes.');
        } else accesoAsig(p.auth, chat.asignaturaId);
        db.chat = db.chat.filter(c => c.id !== p.id); persist(); return { ok: true };
      }
      case 'setChatAbierto': {
        accesoAsig(p.auth, p.asigId);
        const a = asigById(p.asigId);
        a.chatAbierto = p.abierto ? 'Si' : 'No'; persist(); return { ok: true, abierto: p.abierto };
      }

      /* ----- foros de debate ----- */
      case 'getForos': {
        /* los estudiantes ven también los foros cerrados, pero no pueden escribir */
        const arr = db.foros.filter(x => x.asignaturaId === p.asigId);
        return arr.map(x => ({ ...x, abierto: x.abierto === 'Si', posts: db.foroPosts.filter(pp => pp.foroId === x.id).length }));
      }
      case 'saveForo': {
        accesoAsig(p.auth, p.foro?.asignaturaId);
        const f = p.foro;
        if (!f.titulo) err('El foro necesita un título.');
        if (f.id) {
          const i = db.foros.findIndex(x => x.id === f.id);
          if (i < 0) err('Foro no encontrado.');
          db.foros[i] = { ...db.foros[i], ...f, abierto: f.abierto ? 'Si' : 'No' };
        } else {
          db.foros.push({ id: uid('f'), asignaturaId: f.asignaturaId, titulo: f.titulo, pregunta: f.pregunta || '', instrucciones: f.instrucciones || '', minPalabras: +f.minPalabras || 0, abierto: f.abierto ? 'Si' : 'No', creado: now() });
        }
        persist(); return { ok: true };
      }
      case 'deleteForo': {
        accesoAsig(p.auth, p.asigId);
        db.foros = db.foros.filter(x => x.id !== p.id);
        db.foroPosts = db.foroPosts.filter(x => x.foroId !== p.id);
        persist(); return { ok: true };
      }
      case 'setForoAbierto': {
        accesoAsig(p.auth, p.asigId);
        const f = db.foros.find(x => x.id === p.id); if (!f) err('Foro no encontrado.');
        f.abierto = p.abierto ? 'Si' : 'No'; persist(); return { ok: true, abierto: !!p.abierto };
      }
      case 'getForoPosts': {
        const s = p.sesion || {};
        const f = db.foros.find(x => x.id === p.foroId); if (!f) err('Foro no encontrado.');
        if (s.rol === 'estudiante' && !db.matriculas.some(m => m.asignaturaId === f.asignaturaId && m.usuario === s.usuario)) err('No estás matriculado en esta asignatura.');
        const todos = db.foroPosts.filter(pp => pp.foroId === p.foroId).sort((x, y) => x.fecha < y.fecha ? -1 : 1);
        const desde = p.desde ? todos.filter(pp => pp.fecha > p.desde) : todos;
        return { abierto: f.abierto === 'Si', minPalabras: +f.minPalabras || 0, posts: desde.map(pp => ({ id: pp.id, foroId: pp.foroId, usuario: pp.usuario, nombre: pp.nombre, rol: pp.rol, texto: pp.texto, palabras: pp.palabras, fecha: pp.fecha })) };
      }
      case 'postForo': {
        const s = p.sesion || {};
        const f = db.foros.find(x => x.id === p.foroId); if (!f) err('Foro no encontrado.');
        const texto = String(p.texto || '').trim();
        if (!texto) err('Escribe tu aporte.');
        const palabras = cuentaPalabras(texto);
        let nombre, usuario, rolR;
        if (s.rol === 'estudiante') {
          const e = verEst(s.usuario, s.clave);
          if (!db.matriculas.some(m => m.asignaturaId === f.asignaturaId && m.usuario === e.usuario)) err('No estás matriculado en esta asignatura.');
          if (f.abierto !== 'Si') err('El foro está cerrado. Tu profesor lo abrirá cuando corresponda.');
          if (f.minPalabras && palabras < f.minPalabras) err('Tu aporte tiene ' + palabras + ' palabras y el foro pide al menos ' + f.minPalabras + '. Amplía tu análisis antes de publicar.');
          nombre = e.nombre; usuario = e.usuario; rolR = 'estudiante';
        } else {
          const st = accesoAsig(p.auth, f.asignaturaId);
          nombre = st.nivel === 'dir' ? 'Dirección' : (asigById(f.asignaturaId).profesorNombre || 'Profesor');
          usuario = st.nivel === 'dir' ? 'direccion' : st.usuario; rolR = st.nivel === 'dir' ? 'direccion' : 'profesor';
        }
        const pp = { id: uid('fp'), foroId: f.id, asignaturaId: f.asignaturaId, usuario, nombre, rol: rolR, texto: texto.slice(0, 8000), palabras, fecha: now() };
        db.foroPosts.push(pp); persist();
        return { post: { id: pp.id, foroId: f.id, usuario, nombre, rol: rolR, texto: pp.texto, palabras, fecha: pp.fecha } };
      }
      case 'eliminarPostForo': {
        const s = p.sesion || {};
        const pp = db.foroPosts.find(x => x.id === p.id); if (!pp) err('Mensaje no encontrado.');
        if (s.rol === 'estudiante') {
          if (pp.usuario !== s.usuario) err('Solo puedes eliminar tus propios aportes.');
        } else accesoAsig(p.auth, pp.asignaturaId);
        db.foroPosts = db.foroPosts.filter(x => x.id !== p.id); persist(); return { ok: true };
      }

      /* ----- resumen de dirección ----- */
      case 'getResumen': {
        dir(p.auth);
        const gruposMap = {};
        db.estudiantes.forEach(e => { if (!gruposMap[e.grupo]) gruposMap[e.grupo] = []; gruposMap[e.grupo].push(e); });
        const grupos = Object.keys(gruposMap).map(g => {
          const es = gruposMap[g];
          return { grupo: g, total: es.length, activos: es.filter(e => e.estado === 'Activo').length, inactivos: es.filter(e => e.estado !== 'Activo').length };
        });
        const asignaturas = db.asignaturas.map(a => {
          const mat = db.matriculas.filter(m => m.asignaturaId === a.id);
          const pcs = mat.map(m => progresoEst(a.id, m.usuario).pct);
          const proms = mat.map(m => promedioEst(a.id, m.usuario).pct).filter(x => x != null);
          return { ...a, estudiantes: mat.length, progresoMedio: pcs.length ? Math.round(pcs.reduce((s, x) => s + x, 0) / pcs.length) : 0, promedioMedio: proms.length ? Math.round(proms.reduce((s, x) => s + x, 0) / proms.length) : null };
        });
        return {
          grupos, asignaturas,
          totales: {
            estudiantes: db.estudiantes.length,
            activos: db.estudiantes.filter(e => e.estado === 'Activo').length,
            inactivos: db.estudiantes.filter(e => e.estado !== 'Activo').length,
            asignaturas: db.asignaturas.length,
            profesores: db.profesores.length
          }
        };
      }

      default: err('Acción desconocida: ' + action);
    }
  }

  /* vuelca el contenido de un JSON de asignatura en una asignatura existente */
  function volcarContenido_(aid, d) {
    const base = { p: db.pestanas.filter(x => x.asignaturaId === aid).length, x: db.examenes.filter(x => x.asignaturaId === aid).length, t: db.tareas.filter(x => x.asignaturaId === aid).length, f: db.foros.filter(x => x.asignaturaId === aid).length, a: db.anuncios.filter(x => x.asignaturaId === aid).length };
    (d.pestanas || []).forEach((t, i) => {
      base.p++;
      db.pestanas.push({ id: uid('p'), asignaturaId: aid, titulo: t.titulo, icono: t.icono || 'fa-book', tipo: t.tipo || 'contenido', contenido: typeof t.contenido === 'string' ? t.contenido : JSON.stringify(t.contenido), orden: base.p, visible: t.visible !== false });
    });
    (d.examenes || []).forEach(e => {
      base.x++;
      const exId = uid('x');
      db.examenes.push({ id: exId, asignaturaId: aid, titulo: e.titulo, descripcion: e.descripcion || '', visible: e.visible !== false, creado: now() });
      (e.preguntas || []).forEach((q, k) => db.preguntas.push({
        id: uid('q'), examenId: exId, tipo: q.tipo || 'sm', texto: q.texto || '',
        opciones: JSON.stringify(q.tipo === 'vf' ? ['Verdadero', 'Falso'] : (q.tipo === 'emp' ? (q.opciones || mezclarB(q.pares)) : (q.opciones || ['', '', '', '']))),
        pares: q.tipo === 'emp' ? JSON.stringify(q.pares || []) : '',
        correcta: q.tipo === 'emp' ? JSON.stringify((q.pares || []).map(pa => (q.opciones || mezclarB(q.pares)).indexOf(pa.b))) : (q.correcta | 0),
        puntos: +q.puntos || 1, orden: k + 1
      }));
    });
    (d.tareas || []).forEach(t => { base.t++; db.tareas.push({ id: uid('t'), asignaturaId: aid, titulo: t.titulo, instrucciones: t.instrucciones || '', formato: t.formato || '', vence: t.vence || '', visible: t.visible !== false, orden: base.t, creado: now() }); });
    (d.foros || []).forEach(f => { base.f++; db.foros.push({ id: uid('f'), asignaturaId: aid, titulo: f.titulo, pregunta: f.pregunta || '', instrucciones: f.instrucciones || '', minPalabras: +f.minPalabras || 0, abierto: f.abierto || 'No', creado: now() }); });
    (d.anuncios || []).forEach(a => { base.a++; db.anuncios.push({ id: uid('a'), asignaturaId: aid, titulo: a.titulo, tag: a.tag || 'Aviso', cuerpo: a.cuerpo, autor: 'Dirección', fecha: now(), pin: !!a.pin }); });
  }

  /* orden aleatorio de la columna B para las preguntas de emparejar */
  function mezclarB(pares) {
    const b = (pares || []).map(x => x.b);
    for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
    return b;
  }

  return { handle, reset: () => { localStorage.removeItem(KEY); } };
})();

/* ---------- carpeta simulada para el modo demo ---------- */
window.CARPETA_DEMO = (() => {
  'use strict';
  /* lista de archivos de contenido incluidos con la plataforma */
  const LOCAL = [
    'alfabeto.html', 'acentos.html', 'simulador.html', 'sustantivos.html', 'casos.html', 'declinaciones.html',
    'nominativo-acusativo.html', 'juegoDeclinaciones.html', 'articuloDefinido.html', 'articulodefinidoII.html',
    'adjetivos.html', 'adjetivos2.html', 'funcionesAdjetivos.html', 'masDetalles.html', 'IntroPronombres.html',
    'MasPronombres.html', 'funcionesPronombre.html', 'tercerapersona.html', 'formaTerceraPersona.html', 'traduccion.html',
    'Introduccion_Preposiciones.html', 'Mas_sobre_preposiciones.html', 'Frase_preposicional.html', 'tabla_de_preposiciones.html',
    'verbo_eimi.html', 'Nominativo_Predicativo.html', 'Verbos_griegos.html', 'componentes_basicos.html',
    'presente_activo_indicativo.html', 'mas_contenido.html', 'verbos_pasivos.html', 'voz_media.html',
    'intro_imperfecto.html', 'imperfecto_activo.html', 'imperfecto_pasivo.html', 'caracteristicas.html', 'resumen.html',
    'Introduccion_futuro.html', 'mas_futuro.html', 'futuro_medio_indicativo.html', 'futuro_eimi.html', 'futuro_liquido.html'
  ];
  return {
    listar(ruta) {
      const r = String(ruta || '').toLowerCase();
      if (r.includes('drive.google.com') || /^[a-z0-9_-]{20,}$/.test(r.trim()))
        throw new Error('En modo demo no se puede leer una carpeta de Google Drive. Conecta la plataforma a Google Sheets (js/config.js) o usa la carpeta local «contenido».');
      return { carpeta: ruta, archivos: LOCAL.map(n => ({ nombre: n, ruta: String(ruta || 'contenido').replace(/\/+$/, '') + '/' + n.replace(/\.\w+$/, '') + '/' + n, tipo: 'html' })) };
    }
  };
})();
