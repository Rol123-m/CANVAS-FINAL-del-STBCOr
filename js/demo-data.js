/* ============================================================
   DEMO-DATA.JS · Base de datos de estudiantes (72) + asignaturas
   Se usa en modo demo (localStorage). Al conectar Google Sheets,
   code.gs siembra esta misma base de datos con setup(), y la
   asignatura de Griego I se monta importando griego-i.json.
   ============================================================ */
window.DEMO = (() => {
  const E = (nombre, grupo, usuario, clave, estado = 'Activo') => ({ nombre, grupo, usuario, clave, estado });

  const estudiantes = [
    /* ---- 1.er año ---- */
    E('José A. Aguilera Preval', '1.er año', 'jose.aguilera', 'rk7bmsqr'),
    E('Jorge Amarales Sánchez', '1.er año', 'jorge.amarales', 'fb8vcrne'),
    E('Osmani Cabrera Leyva', '1.er año', 'osmani.cabrera', 'yur5vbgt'),
    E('Mario D. Comas Samuel', '1.er año', 'mario.comas', 'v2q9ckyp'),
    E('Carlos E. Correa Fernández', '1.er año', 'carlos.correa', 'n9ghdvzq'),
    E('Yoander Cutiño Martín', '1.er año', 'yoander.cutino', 'v523jymw'),
    E('Maikel Durán Tur', '1.er año', 'maikel.duran', '4ebenvak'),
    E('Raúl García Gómez', '1.er año', 'raul.garcia', '6pfnt8ua'),
    E('Armando Gómez Márquez', '1.er año', 'armando.gomez', 'j7uhwejs'),
    E('Duvier González Samuel', '1.er año', 'duvier.gonzalez', '4pefqzn6'),
    E('Gelkis Guerra Roldán', '1.er año', 'gelkis.guerra', 'hwxer5ne', 'Inactivo'),
    E('Adrián Guerra Sánchez', '1.er año', 'adrian.guerra', 'ntg5ch7a'),
    E('Sandy Guillen Cerpa', '1.er año', 'sandy.guillen', 'pz8a3b9s'),
    E('Josué Legra Pupo', '1.er año', 'josue.legra', '986k59bq'),
    E('Yacher R. Lores Aguilera', '1.er año', 'yacher.lores', 'j47wan55'),
    E('Frank Mena Santana', '1.er año', 'frank.mena', 'qf3ytus6'),
    E('Lesnier Ortiz Díaz', '1.er año', 'lesnier.ortiz', 'm7yjfwy3'),
    E('Usiel Navarro Rodríguez', '1.er año', 'usiel.navarro', 'y7p5bhpg'),
    E('Luis M.Rodriguez Hernández', '1.er año', 'luis.rodriguez', 'm7mz3akr'),
    E('Geovanis Samón Peña', '1.er año', 'geovanis.samon', 'krzs6cyg'),
    E('Alexei Savón Gutiérrez', '1.er año', 'alexei.savon', 'be6gjgvd'),
    /* ---- 2.º año ---- */
    E('Orlando Aguilar Fonseca', '2.º año', 'orlando.aguilar', 'umbq36rn'),
    E('Dennis Almaguer George', '2.º año', 'dennis.almaguer', 'kwphb28m'),
    E('Leonard Luis Carrera Castillo', '2.º año', 'leonard.carrera', 'k8uv448w'),
    E('Amauri Escudero Guilarte', '2.º año', 'amauri.escudero', 'bns73pe8'),
    E('Hector Fernández Valdéz', '2.º año', 'hector.fernandez', 'snehwc9v'),
    E('Marcos González González', '2.º año', 'marcos.gonzalez', 'tgbaw85r'),
    E('Yulin Labrada Hernández', '2.º año', 'yulin.labrada', 'tfkxxmdg'),
    E('Alexei López Lamorú', '2.º año', 'alexei.lopez', 'c86y3v92'),
    E('Yoanys Luvín Delis', '2.º año', 'yoanys.luvin', 'g5w9uu58'),
    E('Joel Favio Martínez Oconor', '2.º año', 'joel.martinez', 'frjc4jvt'),
    E('Yolexis Merencio Árias', '2.º año', 'yolexis.merencio', 'yx4c26df'),
    E('Maikel Molina Figueredo', '2.º año', 'maikel.molina', 'm28cnapw'),
    E('Midel Pileta Romero', '2.º año', 'midel.pileta', 'ewrgh9q8'),
    E('Willer Luis Rabilero Martínez', '2.º año', 'willer.rabilero', 'd8jj8vtd'),
    E('Orley Rodríguez Navarro', '2.º año', 'orley.rodriguez', 's7mbphxt'),
    E('Jolkis Samiñon Paumier', '2.º año', 'jolkis.saminon', 'huxma7b7'),
    E('Victor Torno Mulet', '2.º año', 'victor.torno', 'z8aqdypk'),
    /* ---- 3.er año ---- */
    E('Rolando Aguilar Merayo', '3.er año', 'rolando.aguilar', 'ctfx7hqe'),
    E('Gerardo Almenares Cardoza', '3.er año', 'gerardo.almenares', 'cvk8yddz'),
    E('Ronny Babastro Pérez', '3.er año', 'ronny.babastro', 'qx7qgvg5'),
    E('Aldo Benitez Suarez', '3.er año', 'aldo.benitez', 'stjj9z4s'),
    E('Roleydis Cantillo Furones', '3.er año', 'roleydis.cantillo', 'extvwm6s'),
    E('Eudis Daniel Cardozo Heredia', '3.er año', 'eudis.cardozo', '4b6rya8w'),
    E('Wilber Carrera Llorente', '3.er año', 'wilber.carrera', 'hwg3tja8'),
    E('Jeremías M. Cifuentes Latres', '3.er año', 'jeremias.cifuentes', 'gfzw92s7'),
    E('Armando Cutiño Viamontes', '3.er año', 'armando.cutino', 'bnpme3r8'),
    E('José Antonio Estrada Castro', '3.er año', 'jose.estrada', 'rd9cc3nc'),
    E('Luis Floiran Romero', '3.er año', 'luis.floiran', 'ev8tte25'),
    E('Alejandro Antonio Foubelo Ferrer', '3.er año', 'alejandro.foubelo', '8kj5r4ab'),
    E('Angel Gabriel García Cardero', '3.er año', 'angel.garcia', '7mvdhxek'),
    E('Ruliseidis Legrá Tamayo', '3.er año', 'ruliseidis.legra', 'h6q4qkfn'),
    E('Agustin Nicot Llorente', '3.er año', 'agustin.nicot', '8mq2qd2s'),
    E('Ilber Peña Gutiérrez', '3.er año', 'ilber.pena', 'zwfcfwsq'),
    E('Reidel Verdecia Pino', '3.er año', 'reidel.verdecia', 'akax9vw3'),
    E('David Walter Fis', '3.er año', 'david.walter', '4dzbdnjg'),
    /* ---- 4.º año ---- */
    E('Dannier Aldana Rivero', '4.º año', 'dannier.aldana', 'p7mbts22'),
    E('Diosmel Domínguez Matos', '4.º año', 'diosmel.dominguez', '3mrqwdwg'),
    E('Diosdelkis Hernández Cantillo', '4.º año', 'diosdelkis.hernandez', 'nbxfjqx2'),
    E('Mariano Hernández Nápoles', '4.º año', 'mariano.hernandez', 'hey3k7ja'),
    E('José Hernández Velázquez', '4.º año', 'jose.hernandez', 'uqsrhfhv'),
    E('Elienriel Lobaina Cantillo', '4.º año', 'elienriel.lobaina', 'k95achr9'),
    E('Jaikel López Nieto', '4.º año', 'jaikel.lopez', 'eye2d2wj'),
    E('Leonardo Vaillant García', '4.º año', 'leonardo.vaillant', 'm2c8mgn9'),
    /* ---- Sede Habana ---- */
    E('Magdiel Garcías Avíles', 'Sede Habana · 2.º año', 'magdiel.garcias', 'jmx7djb9'),
    E('José Antonio Leyva Rigñak', 'Sede Habana · 2.º año', 'jose.leyva', '8p636pav'),
    E('Jaider Portales Días', 'Sede Habana · 2.º año', 'jaider.portales', 'wefz7pfb'),
    E('Liuvel Sánchez Campos', 'Sede Habana · 2.º año', 'liuvel.sanchez', 'qzggej26'),
    E('David Hernández Galano', 'Sede Habana · 3.er año', 'david.hernandez', 'yms6dxke'),
    E('Elder Pulgar Valdéz', 'Sede Habana · 3.er año', 'elder.pulgar', 'pw4f2u8b'),
    E('Juan Carlos Díaz Salazar', 'Sede Habana · 3.er año', 'juan.diaz', 'yhf9eq8s'),
    E('Yeider Peña Samón', 'Sede Habana · 3.er año', 'yeider.pena', 'amxc84ff')
  ];

  const grupos = ['1.er año', '2.º año', '3.er año', '4.º año', 'Sede Habana · 2.º año', 'Sede Habana · 3.er año'];

  /* ---- Profesores y asignaturas de ejemplo ----
     Los profesores del ejemplo llevan los datos reales de contacto
     del sílabo (correo y WhatsApp) para que los accesos directos de
     envío de tareas funcionen. La dirección los crea desde la app. */
  function db() {
    const now = new Date().toISOString();
    const asig = 'asig-griego';
    const G = window.GRIEGO_I || { asignatura: {}, pestanas: [], examenes: [], foros: [], tareas: [], anuncios: [], chat: [] };
    /* orden aleatorio de la columna B para las preguntas de emparejar */
    function mezclarB(pares) {
      const b = (pares || []).map(x => x.b);
      for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
      return b;
    }
    const profesores = [
      { id: 'pr1', nombre: 'Ma. Joel Gutiérrez Cabrera', usuario: 'joel.gutierrez', clave: 'griego2026', email: 'joelgc242@gmail.com', whatsapp: '5353422375', estado: 'Activo', creado: now },
      { id: 'pr2', nombre: 'Lic. Rolando Y. Desdín García', usuario: 'rolando.desdin', clave: 'griego2026', email: 'rolandodesdin3@outlook.com', whatsapp: '5358169444', estado: 'Activo', creado: now }
    ];
    const asignaturas = [
      { id: asig, nombre: G.asignatura.nombre || 'Griego I', descripcion: G.asignatura.descripcion || '', color: G.asignatura.color || '#14385c', profesor: 'joel.gutierrez', profesorNombre: 'Ma. Joel Gutiérrez Cabrera', profEmail: G.asignatura.profEmail || '', profWa: G.asignatura.profWa || '', carpeta: G.asignatura.carpeta || 'contenido', chatAbierto: 'Si', creada: now },
      { id: 'asig-demo2', nombre: 'Homilética I', descripcion: 'Principios de la predicación expositiva y construcción del sermón.', color: '#3f7d58', profesor: '', profesorNombre: '', profEmail: '', profWa: '', carpeta: '', chatAbierto: 'No', creada: now }
    ];
    /* módulos de Griego I desde la fuente única */
    const pestanas = G.pestanas.map((t, i) => ({ id: 'p' + (i + 1), asignaturaId: asig, titulo: t.titulo, icono: t.icono || 'fa-book', tipo: t.tipo || 'contenido', contenido: typeof t.contenido === 'string' ? t.contenido : JSON.stringify(t.contenido), orden: i + 1, visible: t.visible !== false }));
    /* segunda asignatura de ejemplo: un módulo de muestra */
    pestanas.push({ id: 'pd2-1', asignaturaId: 'asig-demo2', titulo: 'Presentación', icono: 'fa-circle-info', tipo: 'contenido', contenido: 'Esta asignatura se está preparando. La dirección asignará el profesor y este montará los módulos, exámenes, tareas y anuncios.', orden: 1, visible: true });
    /* exámenes + preguntas de Griego I */
    const examenes = [], preguntas = [];
    G.examenes.forEach((e, i) => {
      const exId = 'x' + (i + 1);
      examenes.push({ id: exId, asignaturaId: asig, titulo: e.titulo, descripcion: e.descripcion || '', visible: e.visible !== false, creado: now });
      e.preguntas.forEach((q, k) => {
        const ops = q.tipo === 'vf' ? ['Verdadero', 'Falso'] : (q.tipo === 'emp' ? mezclarB(q.pares) : (q.opciones || ['', '', '', '']));
        preguntas.push({
          id: exId + 'q' + k, examenId: exId, tipo: q.tipo, texto: q.texto,
          opciones: JSON.stringify(ops),
          pares: q.pares ? JSON.stringify(q.pares) : '',
          correcta: q.tipo === 'emp' ? JSON.stringify(q.pares.map(p => ops.indexOf(p.b))) : (q.correcta | 0),
          puntos: +q.puntos || 1, orden: k + 1
        });
      });
    });
    /* matrículas: 1.er año completo en Griego I · 3.er año en Homilética */
    const matriculas = [
      ...estudiantes.filter(e => e.grupo === '1.er año').map(e => ({ id: 'm-' + e.usuario, asignaturaId: asig, usuario: e.usuario, grupo: e.grupo, fecha: now })),
      ...estudiantes.filter(e => e.grupo === '3.er año').map(e => ({ id: 'm2-' + e.usuario, asignaturaId: 'asig-demo2', usuario: e.usuario, grupo: e.grupo, fecha: now }))
    ];
    return {
      estudiantes, grupos, profesores, asignaturas, matriculas, pestanas, examenes, preguntas,
      intentos: [], progreso: [],
      tareas: (G.tareas || []).map((t, i) => ({ id: 't' + (i + 1), asignaturaId: asig, titulo: t.titulo, instrucciones: t.instrucciones || '', formato: t.formato || '', vence: t.vence || '', visible: t.visible !== false, orden: i + 1, creado: now })),
      tareaEntregas: [],
      anuncios: (G.anuncios || []).map((a, i) => ({ id: 'a' + (i + 1), asignaturaId: asig, titulo: a.titulo, tag: a.tag || 'Aviso', cuerpo: a.cuerpo, autor: 'Ma. Joel Gutiérrez Cabrera', fecha: now, pin: !!a.pin })),
      chat: (G.chat || []).map((c, i) => ({ id: 'c' + (i + 1), asignaturaId: asig, usuario: 'joel.gutierrez', nombre: 'Ma. Joel Gutiérrez Cabrera', rol: c.rol || 'profesor', texto: c.texto, fecha: now })),
      foros: (G.foros || []).map((f, i) => ({ id: 'f' + (i + 1), asignaturaId: asig, titulo: f.titulo, pregunta: f.pregunta || '', instrucciones: f.instrucciones || '', minPalabras: +f.minPalabras || 0, abierto: f.abierto || 'Si', creado: now })),
      foroPosts: []
    };
  }

  return { estudiantes, grupos, db };
})();
