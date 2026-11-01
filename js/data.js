// ============================================================
//  DATOS DEL JUEGO: ideologías, profesiones, debate, misiones,
//  leyes, ministerios, acciones y eventos.
//  Todo lo que es "contenido" vive aquí para poder ampliarlo fácilmente.
// ============================================================
'use strict';

// ---------- Ejes ideológicos ----------
// Cada eje va de -2 a +2. El índice 0..4 de labels corresponde a -2..+2.
// El eje territorial va de -2 = centralismo (izquierda) a +2 = confederalismo (derecha).
const AXES = [
  { id: 'eco', name: 'Economía', short: 'Eco', icon: 'coins',
    labels: ['Socialismo', 'Socialdemocracia', 'Socioliberalismo', 'Liberalismo', 'Neoliberalismo'],
    ends: ['Izquierda', 'Derecha'] },
  { id: 'soc', name: 'Sociedad', short: 'Soc', icon: 'users',
    labels: ['Posmodernismo', 'Progresismo', 'Moderación', 'Conservadurismo', 'Tradicionalismo'],
    ends: ['Progresista', 'Tradicional'] },
  { id: 'ter', name: 'Territorio', short: 'Ter', icon: 'map',
    // El centralismo cuenta como izquierda (−) y el federalismo/cantonalismo como derecha (+)
    labels: ['Centralismo', 'Unitarismo', 'Autonomismo', 'Federalismo', 'Confederalismo'],
    ends: ['Centralización', 'Descentralización'] },
  { id: 'ext', name: 'Mundo', short: 'Ext', icon: 'globe',
    labels: ['Globalismo', 'Internacionalismo', 'Pragmatismo', 'Nacionalismo', 'Soberanismo'],
    ends: ['Apertura', 'Soberanía'] },
  { id: 'aut', name: 'Autoridad', short: 'Aut', icon: 'gavel',
    labels: ['Radicalismo', 'Garantismo', 'Legalismo', 'Autoritarismo', 'Totalitarismo'],
    ends: ['Libertades', 'Orden'] },
  { id: 'amb', name: 'Medio ambiente', short: 'Amb', icon: 'leaf',
    labels: ['Ecologismo', 'Ambientalismo', 'Sostenibilidad', 'Desarrollismo', 'Productivismo'],
    ends: ['Ecología', 'Producción'] },
];
const AXIS_IDS = AXES.map(a => a.id);
// Punto de partida del eje territorial de la ciudadanía (luego cuentan la profesión, el origen y el fervor)
const TER_BASE = -0.2;
// Nacen 104 varones por cada 100 mujeres
const GIRL_SHARE = 100 / 204;
// Las mujeres viven algo más: su riesgo de morir cada año es menor que el de los hombres
const SEX_MORTALITY = { M: 0.9, H: 1.07 };
// Valores continuos (impuestos): se redondean a centésimas de punto porcentual
// Igualdad de valores de una ley (los tratados parciales son listas)
const sameVal = (a, b) => a === b || JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
// Nombres de una lista de cantones (concierto económico)
function cantonSetLabel(v) {
  if (!Array.isArray(v) || !v.length) return 'Ningún cantón';
  const cs = (typeof G !== 'undefined' && G && G.cantons) || (typeof V !== 'undefined' && V && V.cantons) || [];
  return v.map(i => (cs[i] && cs[i].name) || 'Cantón ' + (i + 1)).join(', ');
}
function fieldValueOk(f, v) {
  if (v === null && f.optional) return true;
  if (f.cantonSet) {
    const cs = (typeof G !== 'undefined' && G && G.cantons) || [];
    return Array.isArray(v) && v.every((i, k) => Number.isInteger(i) && cs[i] && !cs[i].merged && v.indexOf(i) === k && (k === 0 || v[k - 1] < i));
  }
  if (f.treaty) return v === false || v === true || (Array.isArray(v) && v.length > 0 && v.length < GOOD_IDS.length && v.every((g, i) => GOOD_IDS.includes(g) && v.indexOf(g) === i));
  const prec = f.unit === 'pct' ? 100 : 10000;
  if (f.range) return typeof v === 'number' && isFinite(v) && v >= f.range[0] - 1e-9 && v <= f.range[1] + 1e-9 && Math.abs(Math.round(v * prec) - v * prec) < 1e-6;
  return f.options.some(o => o === v);
}
// Eje ideológico general: la media de la posición en todos los ejes, tal como se dibujan
// (izquierda del dibujo = negativo). Un partido socialdemócrata y garantista pero conservador
// y federalista queda, de media, en el centro.
const IDEO_AXIS = { id: 'ideo', name: 'Eje ideológico', icon: 'scale', labels: ['Extrema izquierda', 'Izquierda', 'Centro', 'Derecha', 'Extrema derecha'] };
function overallIdeo(ideo) { return avg(AXES, a => (a.flip ? -1 : 1) * ((ideo && ideo[a.id]) || 0)); }
// Dónde se sienta un partido en el hemiciclo: de izquierda a derecha según su posición en el eje ideológico general
const seatKey = p => overallIdeo(p.ideo) + 0.05 * (p.ideo.eco || 0);
function axisLabel(axisId, v) {
  const ax = axisId === 'ideo' ? IDEO_AXIS : AXES.find(a => a.id === axisId);
  return ax.labels[clamp(Math.round(v) + 2, 0, 4)];
}

// ---------- Sectores económicos ----------
// Toda la actividad sale de las empresas (y de los servicios públicos). color: para los gráficos
const SECTORS = [
  { id: 'agricultura', name: 'Agricultura', color: '#a3c14a', goods: true },
  { id: 'ganaderia', name: 'Ganadería', color: '#c1844e', goods: true },
  { id: 'pesca', name: 'Pesca', color: '#3f8fc0', goods: true },
  { id: 'silvicultura', name: 'Silvicultura', color: '#3e7d4c', goods: true },
  { id: 'muebles', name: 'Muebles', color: '#8a5a3a', goods: true },
  { id: 'textil', name: 'Textil', color: '#b05a9a', goods: true },
  { id: 'canteras', name: 'Canteras', color: '#a59a8a', goods: true },
  { id: 'mineria', name: 'Minería', color: '#5f6b7a', goods: true },
  { id: 'maquinaria', name: 'Maquinaria', color: '#7d8fa8', goods: true },
  { id: 'armamento', name: 'Armamento', color: '#6b6b3a', goods: true },
  { id: 'energia', name: 'Electricidad', color: '#f2c14e', goods: true },
  { id: 'telecom', name: 'Telecomunicaciones', color: '#4fd0c7', goods: true },
  { id: 'medios', name: 'Medios de comunicación', color: '#c86fd0', goods: true },
  { id: 'deporte', name: 'Gimnasios', color: '#e86a8f', goods: true },
  { id: 'alimentacion', name: 'Industria alimentaria', color: '#d9a441', goods: true },
  { id: 'comercio', name: 'Pequeño comercio', color: '#6fb27a', goods: true },
  { id: 'construccion', name: 'Construcción', color: '#c9a227' },
  { id: 'finanzas', name: 'Banca', color: '#2e8b8b' },
  { id: 'sanidad', noun: 'la sanidad', name: 'Sanidad', color: '#d14b4b', area: 'sanidad' },
  { id: 'educacion', noun: 'la ley educativa', name: 'Educación', color: '#e68a2e', area: 'educacion' },
  { id: 'seguridad', noun: 'la ley de seguridad', name: 'Seguridad', color: '#4a5d7a', area: 'seguridad' },
];
const PRIVATE_SECTORS = SECTORS.filter(s => s.goods).map(s => s.id).concat(['construccion', 'finanzas']);
const PUBLIC_SECTORS = ['sanidad', 'educacion', 'seguridad'];

// ---------- Bienes ----------
// Todas las cantidades van en unidades (u) por turno (un trimestre).
// price: precio de referencia en el mercado mundial (miles de € por unidad; se muestra en €)
// bulk: lo que encarece el producto cada paso de transporte (cantón vecino), como parte de su precio
// overseas: false si no se puede traer del resto del mundo por mar (la electricidad y la conexión a internet)
const GOODS = {
  grano: { name: 'Grano', unit: 'u', price: 0.4, bulk: 0.06, icon: 'wheat', food: true },
  tejido: { name: 'Tejido (algodón y lana)', unit: 'u', price: 0.8, bulk: 0.03, icon: 'shirt' },
  carne: { name: 'Carne', unit: 'u', price: 1.0, bulk: 0.05, icon: 'beef', food: true },
  pescado: { name: 'Pescado', unit: 'u', price: 0.65, bulk: 0.06, icon: 'fish', food: true },
  madera: { name: 'Madera', unit: 'u', price: 0.4, bulk: 0.07, icon: 'trees' },
  muebles: { name: 'Muebles', unit: 'u', price: 2.4, bulk: 0.04, icon: 'hourglass' },
  ropa: { name: 'Ropa', unit: 'u', price: 1.2, bulk: 0.02, icon: 'shirt' },
  piedra: { name: 'Piedra', unit: 'u', price: 0.4, bulk: 0.09, icon: 'mountain' },
  metal: { name: 'Metal', unit: 'u', price: 1.6, bulk: 0.04, icon: 'anvil' },
  carbon: { name: 'Carbón', unit: 'u', price: 0.4, bulk: 0.07, icon: 'flame' },
  maquinas: { name: 'Máquinas', unit: 'u', price: 16, bulk: 0.02, icon: 'cog' },
  armas: { name: 'Armas', unit: 'u', price: 4, bulk: 0.02, icon: 'crosshair' },
  electricidad: { name: 'Electricidad', unit: 'u', price: 0.35, bulk: 0.05, overseas: false, icon: 'zap' },
  telecom: { name: 'Conexión a internet', unit: 'u', price: 0.55, bulk: 0.02, overseas: false, icon: 'wifi' },
  entretenimiento: { name: 'Entretenimiento', unit: 'u', price: 0.5, bulk: 0.01, icon: 'tv' },
  // comida elaborada: cada unidad alimenta más que el grano, la carne o el pescado (sirve de alimento básico y de lujo)
  alimentos: { name: 'Alimentos procesados', unit: 'u', price: 2.0, bulk: 0.04, icon: 'utensils', food: true },
  // servicios de los comercios del barrio: llegan poco más allá del cantón (cada salto encarece un 25 %) y no cruzan el mar
  servicios: { name: 'Servicios del comercio', unit: 'u', price: 1.0, bulk: 0.25, overseas: false, icon: 'store' },
  // un servicio: solo se usa donde está el gimnasio (llevarlo a otro cantón casi no compensa)
  gimnasio: { name: 'Gimnasio', unit: 'u', price: 0.5, bulk: 0.3, overseas: false, local: true, icon: 'dumbbell' },
};
// Orden en que se reparten los mercados de cada turno: primero lo que no necesita insumos y luego lo que
// se fabrica con ello (así una fábrica sabe cuánta materia prima ha conseguido antes de vender lo que produce)
const GOOD_CHAIN = ['grano', 'carne', 'pescado', 'alimentos', 'tejido', 'madera', 'piedra', 'metal', 'carbon', 'maquinas', 'gimnasio', 'electricidad', 'telecom', 'entretenimiento', 'armas', 'muebles', 'ropa', 'servicios'];
const GOOD_IDS = Object.keys(GOODS);

// ---------- Empresas ----------
// Cada empresa tiene un nivel. cap: trabajadores (sin contar al dueño) por cada nivel; una de nivel N admite N × cap.
// out / inp: unidades que produce y gasta CADA trabajador en un turno (iguales para todos). Cada nivel por encima
// del 1 suma un 3 % de productividad (y gasta un 3 % más de insumos). capex: lo que cuesta construir un nivel (k€).
// Con los precios de referencia, cada trabajador genera unos 8.000 € de valor añadido por turno.
const FIRM_KINDS = {
  agricultura: { sector: 'agricultura', name: 'Explotación agrícola', icon: 'wheat', cap: 4, capex: 80, out: { grano: 20 }, alt: { tejido: 10 }, prof: 'agricultor',
    names: ['Cultivos', 'Granja', 'Hacienda', 'Cooperativa agrícola'] },
  ganaderia: { sector: 'ganaderia', name: 'Explotación ganadera', icon: 'beef', cap: 3, capex: 70, out: { carne: 7, tejido: 1 }, prof: 'agricultor',
    names: ['Ganadería', 'Rancho', 'Granja', 'Cooperativa ganadera'] },
  pesca: { sector: 'pesca', name: 'Empresa pesquera', icon: 'fish', cap: 4, capex: 70, out: { pescado: 12 }, prof: 'pescador', names: ['Pesquera', 'Armadores', 'Lonja'] },
  silvicultura: { sector: 'silvicultura', name: 'Explotación forestal', icon: 'trees', cap: 3, capex: 50, out: { madera: 20 }, prof: 'operario', names: ['Maderas', 'Forestal', 'Aserradero'] },
  cantera: { sector: 'canteras', name: 'Cantera', icon: 'mountain', cap: 4, capex: 70, out: { piedra: 20 }, prof: 'operario', names: ['Canteras', 'Piedras', 'Áridos'] },
  minaMetal: { sector: 'mineria', name: 'Mina de metal', icon: 'pickaxe', cap: 6, capex: 150, out: { metal: 5 }, prof: 'operario', names: ['Minas', 'Minera', 'Metales'] },
  minaCarbon: { sector: 'mineria', name: 'Mina de carbón', icon: 'pickaxe', cap: 6, capex: 130, out: { carbon: 20 }, prof: 'operario', names: ['Hulleras', 'Carbones', 'Minas'] },
  muebles: { sector: 'muebles', name: 'Fábrica de muebles', icon: 'hourglass', cap: 6, capex: 120, out: { muebles: 5 }, inp: { madera: 10 }, prof: 'operario', boost: { electricidad: 2 }, names: ['Muebles', 'Carpintería', 'Ebanistería'] },
  textil: { sector: 'textil', name: 'Fábrica textil', icon: 'shirt', cap: 8, capex: 140, out: { ropa: 10 }, inp: { tejido: 5 }, prof: 'operario', boost: { electricidad: 2 }, names: ['Textiles', 'Confecciones', 'Tejidos'] },
  maquinaria: { sector: 'maquinaria', name: 'Fábrica de máquinas', icon: 'cog', cap: 6, capex: 160, out: { maquinas: 1 }, inp: { metal: 5 }, profs: [['operario', 0.7], ['ingeniero', 0.3]], boost: { electricidad: 2 }, names: ['Maquinaria', 'Talleres', 'Industrias Mecánicas'] },
  armamento: { sector: 'armamento', name: 'Fábrica de armas', icon: 'crosshair', cap: 6, capex: 170, out: { armas: 4 }, inp: { metal: 5 }, profs: [['operario', 0.6], ['ingeniero', 0.4]], boost: { electricidad: 2 }, names: ['Armería', 'Industrias de Defensa', 'Arsenales'] },
  electrica: { sector: 'energia', name: 'Central eléctrica', icon: 'zap', cap: 5, capex: 250, out: { electricidad: 40 }, inp: { carbon: 10, maquinas: 0.1 }, profs: [['ingeniero', 0.6], ['operario', 0.4]], names: ['Eléctrica', 'Energía', 'Centrales'] },
  telecom: { sector: 'telecom', name: 'Operadora de telecomunicaciones', icon: 'wifi', cap: 5, capex: 150, out: { telecom: 20 }, inp: { electricidad: 8 }, prof: 'ingeniero', names: ['Telecom', 'Redes', 'Conecta'] },
  medios: { sector: 'medios', name: 'Medio de comunicación', icon: 'tv', cap: 5, capex: 100, out: { entretenimiento: 20 }, inp: { electricidad: 2, telecom: 2 }, prof: 'periodista', names: ['Televisión', 'Radio', 'Grupo de Comunicación', 'Diario'] },
  gimnasio: { sector: 'deporte', name: 'Gimnasio', icon: 'dumbbell', cap: 3, maxLvl: 2, capex: 60, out: { gimnasio: 18 }, inp: { maquinas: 0.05 }, prof: 'comerciante', names: ['Gimnasio', 'Club Deportivo', 'Centro Fitness', 'Polideportivo'] },
  // industria alimentaria: transforma grano, carne o pescado (lo que le salga más barato) en alimentos procesados.
  // inpAny: lo que gastaría cada trabajador si usara solo ese insumo; el reparto real entre ellos sigue a los precios
  alimentacion: { sector: 'alimentacion', name: 'Industria alimentaria', icon: 'utensils', cap: 6, capex: 120, out: { alimentos: 6 }, inpAny: { grano: 10, carne: 4, pescado: 6.15 }, prof: 'operario', boost: { electricidad: 2 },
    names: ['Conservas', 'Alimentaria', 'Industrias Cárnicas', 'Productos del Campo', 'Obrador'] },
  // pequeño comercio: convierte alimentos, ropa o conexión en servicios (tiendas, bares, peluquerías…) que cuentan como ocio
  comercio: { sector: 'comercio', name: 'Pequeño comercio', icon: 'store', cap: 3, maxLvl: 3, capex: 50, out: { servicios: 12 }, inpAny: { alimentos: 2, ropa: 3.33, telecom: 7.27 }, prof: 'comerciante',
    names: ['Comercio', 'Tienda', 'Bazar', 'Mercado', 'Colmado', 'Boutique'] },
  sanidad: { sector: 'sanidad', name: 'Clínica privada', icon: 'stethoscope', cap: 5, capex: 140, prof: 'sanitario', boost: { telecom: 1 }, names: ['Clínica', 'Policlínica', 'Centro médico'] },
  educacion: { sector: 'educacion', name: 'Colegio privado', icon: 'graduation-cap', cap: 4, capex: 110, prof: 'academico', boost: { telecom: 1 }, names: ['Colegio', 'Academia', 'Escuela'] },
  banco: { sector: 'finanzas', name: 'Banco', icon: 'landmark', cap: 8, capex: 100, prof: 'oficinista', boost: { telecom: 1 }, names: ['Banco', 'Caja', 'Caja Rural', 'Banca'] },
  constructora: { sector: 'construccion', name: 'Constructora', icon: 'hard-hat', cap: 20, capex: 60, prof: 'operario', names: ['Construcciones', 'Obras y Contratas', 'Edificaciones', 'Promociones'] },
  policia: { sector: 'seguridad', name: 'Policía', icon: 'siren', cap: 1e9, prof: 'policia' },
};
// Productividad extra por nivel (un 3 % por cada nivel por encima del 1)
const LEVEL_BONUS = 0.03;
const levelF = lvl => 1 + LEVEL_BONUS * Math.max(0, (lvl || 1) - 1);
// Parcelas que ocupa cada edificio en una casilla (cada casilla tiene un límite de parcelas)
const LOTS = { casa: 1, bloque: 3, agricultura: 2, ganaderia: 2, pesca: 1, silvicultura: 1, muebles: 2, textil: 3, sanidad: 2, educacion: 2, banco: 1, constructora: 1,
  cantera: 2, minaMetal: 2, minaCarbon: 2, maquinaria: 3, armamento: 3, electrica: 3, telecom: 1, medios: 1, gimnasio: 1, alimentacion: 3, comercio: 1,
  centroSalud: 1, hospital: 4, colegio: 2, universidad: 4, comisaria: 1, cuartel: 4 };
// Mejoras: una empresa que compra esta cantidad (por trabajador y turno) produce un tanto más
const BOOST_GAIN = { electricidad: 0.2, telecom: 0.15 };
// Compras públicas: lo que no son sueldos en sanidad, educación, seguridad y defensa se gasta en bienes
// (reparto del dinero entre productos)
const PUBLIC_BASKET = {
  sanidad: { electricidad: 0.2, telecom: 0.15, maquinas: 0.25, muebles: 0.1, ropa: 0.1, grano: 0.1, carne: 0.1 },
  educacion: { electricidad: 0.2, telecom: 0.25, muebles: 0.25, maquinas: 0.1, entretenimiento: 0.1, madera: 0.1 },
  seguridad: { armas: 0.35, maquinas: 0.25, electricidad: 0.15, telecom: 0.15, ropa: 0.1 },
  defensa: { armas: 0.45, maquinas: 0.3, electricidad: 0.1, metal: 0.1, ropa: 0.05 },
  // administración, cultura, ciencia, energías limpias y parte de los servicios sociales
  otros: { electricidad: 0.25, telecom: 0.2, muebles: 0.15, ropa: 0.1, maquinas: 0.1, entretenimiento: 0.1, madera: 0.05, carne: 0.05 },
};
// Parte del gasto en asuntos sociales que llega como ayuda en dinero a los hogares más pobres (el resto son servicios)
const SOCIAL_CASH = 0.6;
// Lo que gasta en armas cada agente de seguridad por turno (unidades)
const ARMS_PER_AGENT = 0.05;
// Vivienda: precio de referencia (k€, con el salario medio de partida) y trabajo para construirla (trabajadores × trimestre)
const HOUSING = { price: { casa: 175, piso: 135 }, work: { casa: 9, piso: 7 }, workPerLot: 5, buyCosts: 0.05, maderaPerWork: 8, piedraPerWork: 5, otherShare: 0.25 };

// ---------- Necesidades de los hogares (al estilo de Victoria 3) ----------
// Cada hogar tiene un nivel de vida (1 a 10) según sus ingresos netos al año por adulto equivalente (los menores
// cuentan medio), en euros de partida: indigente (menos de 5.000 €), pasando penurias (5.000-9.999), pobre
// (10.000-14.999), tirando (15.000-19.999), seguro (20.000-24.999), próspero (25.000-29.999), abundante
// (30.000-39.999), rico (40.000-49.999), lujoso (50.000-59.999) y opulento (60.000 o más).
// Su cesta pide, cada turno y por adulto equivalente, unidades de cada necesidad (q, de nivel 1 a 10; entre un
// nivel y el siguiente cambian poco a poco). goods: con qué bienes se cubre y cuánto cubre cada unidad; max: la
// parte de la necesidad que puede cubrir como mucho un bien (y min, como poco). El hogar compra sobre todo lo que
// le sale más barato por unidad cubierta, con algo de variedad.
//  · Alimentos básicos (de indigente a abundante): grano (1), pescado (1,5), carne (2) y alimentos procesados (3).
//  · Alimentos de lujo (desde seguro): carne (1; entre el 10 % y el 75 %) y alimentos procesados (2).
//  · Ropa sencilla (hasta tirando): tejido (como mucho la mitad) y ropa. Ropa (desde pobre): ropa.
//  · Enseres básicos (de pasando penurias a tirando): madera (como mucho la mitad) y muebles. Artículos del hogar
//    (desde pobre): muebles; cuanto más rico, más.
//  · Calefacción (todos): tejido (hasta el 25 %), madera (hasta el 50 %), carbón (1,5; hasta el 80 %) y electricidad.
//  · Ocio (desde seguro): conexión (hasta el 30 %), entretenimiento, gimnasio y servicios del comercio (2).
//  · Salud (todos): la sanidad pública o la privada; necesita más quien es mayor y quien vive mejor.
const WEALTH_NAMES = ['Indigente', 'Pasando penurias', 'Pobre', 'Tirando', 'Seguro', 'Próspero', 'Abundante', 'Rico', 'Lujoso', 'Opulento'];
const WEALTH_INCOME = [0, 5, 10, 15, 20, 25, 30, 40, 50, 60];
// Parte de sus ingresos que gasta en la cesta quien acaba de llegar a cada nivel (el resto lo ahorra)
const WEALTH_SPEND = [1, 1, 0.99, 0.98, 0.97, 0.96, 0.95, 0.94, 0.93, 0.92];
// Lo que cuesta la cesta de cada nivel a precios de referencia (k€ por turno y adulto equivalente, sin IVA): la
// que se puede pagar con lo que se gasta al llegar a ese nivel (con un IVA típico del 15 %)
const BASKET_REF = range(10).map(l => l === 0 ? 0.85 : WEALTH_INCOME[l] * WEALTH_SPEND[l] / (4 * 1.15));
const NEEDS = [
  { id: 'comida', name: 'Alimentos básicos', icon: 'wheat', goods: { grano: 1, pescado: 1.5, carne: 2, alimentos: 3 }, max: { grano: 0.9, pescado: 0.9, carne: 0.9, alimentos: 0.9 },
    share: [0.8, 0.7, 0.58, 0.48, 0.38, 0.28, 0.18, 0, 0, 0] },
  { id: 'lujo', name: 'Alimentos de lujo', icon: 'beef', goods: { carne: 1, alimentos: 2 }, max: { carne: 0.75 }, min: { carne: 0.1 },
    share: [0, 0, 0, 0, 0.06, 0.13, 0.2, 0.28, 0.3, 0.3] },
  { id: 'ropaS', name: 'Ropa sencilla', icon: 'shirt', goods: { tejido: 1, ropa: 1 }, max: { tejido: 0.5 }, share: [0.07, 0.06, 0.05, 0.03, 0, 0, 0, 0, 0, 0] },
  { id: 'ropa', name: 'Ropa', icon: 'shirt', goods: { ropa: 1 }, share: [0, 0, 0.03, 0.06, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08] },
  { id: 'enseres', name: 'Enseres básicos', icon: 'hourglass', goods: { madera: 1, muebles: 1 }, max: { madera: 0.5 }, share: [0, 0.05, 0.05, 0.04, 0, 0, 0, 0, 0, 0] },
  { id: 'hogar', name: 'Artículos del hogar', icon: 'hourglass', goods: { muebles: 1 }, share: [0, 0, 0.02, 0.04, 0.06, 0.07, 0.08, 0.09, 0.1, 0.1] },
  { id: 'calor', name: 'Calefacción', icon: 'flame', goods: { tejido: 1, madera: 1, carbon: 1.5, electricidad: 1 }, max: { tejido: 0.25, madera: 0.5, carbon: 0.8 },
    share: [0.13, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12] },
  { id: 'ocio', name: 'Ocio', icon: 'tv', goods: { telecom: 1, entretenimiento: 1, gimnasio: 1, servicios: 2, armas: 1 }, max: { telecom: 0.3 },
    share: [0, 0, 0, 0, 0.08, 0.12, 0.16, 0.2, 0.22, 0.24] },
  // (la salud no se compra en el mercado: la cubren la sanidad pública y las clínicas privadas)
  { id: 'salud', name: 'Salud', icon: 'stethoscope', goods: {}, service: 'sanidad', q: [0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5] },
];
// Lo que cuesta una unidad de cada necesidad a precios de referencia: lo más barato que se puede comprar
// respetando lo que puede cubrir cada bien (min y max)
function needUnitCost(n, priceOf) {
  const gs = Object.keys(n.goods).filter(g => g !== 'armas');
  if (!gs.length) return 0.35;   // salud: una consulta al trimestre en una clínica privada
  let left = 1, cost = 0;
  const mins = n.min || {}, maxs = n.max || {};
  for (const g of gs) if (mins[g]) { cost += mins[g] * priceOf(g) / n.goods[g]; left -= mins[g]; }
  for (const g of gs.slice().sort((a, b) => priceOf(a) / n.goods[a] - priceOf(b) / n.goods[b])) {
    if (left <= 1e-9) break;
    const take = Math.min(left, (maxs[g] ?? 1) - (mins[g] || 0));
    if (take > 0) { cost += take * priceOf(g) / n.goods[g]; left -= take; }
  }
  return cost;
}
const NEED_UNIT_REF = Object.fromEntries(NEEDS.map(n => [n.id, needUnitCost(n, g => GOODS[g].price)]));
// Unidades de cada necesidad que pide cada nivel: su parte de la cesta (normalizada) entre lo que cuesta cada unidad
{
  const tot = range(10).map(l => sum(NEEDS.filter(n => n.share), n => n.share[l]));
  NEEDS.forEach(n => { if (n.share) n.q = range(10).map(l => Math.round(n.share[l] / tot[l] * BASKET_REF[l] / NEED_UNIT_REF[n.id] * 1000) / 1000); });
}
const NEED_IDS = NEEDS.map(n => n.id);

// Centros públicos (los abren y cierran los gobiernos)
const PUBLIC_CENTERS = {
  centroSalud: { sector: 'sanidad', name: 'Centro de salud', icon: 'stethoscope', cap: 8, cost: 0.6, town: true },
  hospital: { sector: 'sanidad', name: 'Hospital', icon: 'hospital', cap: 30, cost: 2.6, town: false },
  colegio: { sector: 'educacion', name: 'Colegio público', icon: 'school', cap: 12, cost: 0.8, town: true },
  universidad: { sector: 'educacion', name: 'Universidad', icon: 'graduation-cap', cap: 30, cost: 3, town: false },
  comisaria: { sector: 'seguridad', name: 'Comisaría', icon: 'siren', cap: 12, cost: 0.7, town: true },
  cuartel: { sector: 'seguridad', budget: 'defensa', name: 'Cuartel', icon: 'shield', cap: 40, cost: 3, town: false, stateOnly: true },
};
// Servicios: qué atiende cada profesional (pacientes o alumnos al año) y cuánto cobra un centro privado por persona y año (k€)
const SERVICE = { sanidad: { per: 55, fee: 1.4 }, educacion: { per: 12, fee: 5 } };
const PUBLIC_WAGE = 25;   // salario de referencia en el sector público (k€/año, nivel medio)

// ---------- Profesiones ----------
// lean: inclinación ideológica media; sal: ejes que más le importan; lvl: nivel económico típico (1-5)
const PROFESSIONS = {
  agricultor: { name: 'Agricultor/a', sector: 'agricultura', lvl: 2, lean: { eco: 0.2, soc: 0.8, ter: 0.4, ext: 0.9, amb: 0.6, aut: 0.4 }, sal: { ext: 1.5, amb: 1.4 } },
  pescador: { name: 'Pescador/a', sector: 'pesca', lvl: 2, lean: { eco: 0, soc: 0.6, ter: 0.0, ext: 0.8, amb: 0.4, aut: 0.3 }, sal: { ext: 1.4 } },
  operario: { name: 'Operario/a', sector: 'textil', lvl: 2, lean: { eco: -0.9, soc: 0.1, ter: -0.3, ext: 0.6, amb: 0.5, aut: 0.0 }, sal: { eco: 1.5 } },
  empresario: { name: 'Empresario/a', sector: null, lvl: 5, lean: { eco: 1.4, soc: 0, ter: 0.0, ext: -0.2, amb: 0.8, aut: 0.4 }, sal: { eco: 2.0 } },
  sanitario: { name: 'Profesional sanitario/a', sector: 'sanidad', lvl: 3, lean: { eco: -0.6, soc: -0.4, ter: 0.0, ext: -0.3, amb: -0.3, aut: -0.2 }, sal: { eco: 1.3 } },
  academico: { name: 'Académico/a', sector: 'educacion', lvl: 3, lean: { eco: -0.7, soc: -0.8, ter: 0.0, ext: -0.5, amb: -0.6, aut: -0.6 }, sal: { soc: 1.4 } },
  oficinista: { name: 'Oficinista', sector: 'finanzas', lvl: 3, lean: { eco: 0.3, soc: 0, ter: 0.0, ext: 0.0, amb: 0.1, aut: 0.1 }, sal: { eco: 1.4 } },
  comerciante: { name: 'Comerciante', sector: 'comercio', lvl: 2, lean: { eco: 0.4, soc: 0.3, ter: 0.0, ext: 0.3, amb: 0.3, aut: 0.2 }, sal: { eco: 1.5 } },
  ingeniero: { name: 'Ingeniero/a', sector: 'energia', lvl: 4, lean: { eco: 0.4, soc: -0.3, ter: 0.0, ext: -0.3, amb: -0.1, aut: 0.0 }, sal: { eco: 1.3 } },
  periodista: { name: 'Periodista', sector: 'medios', lvl: 3, lean: { eco: -0.4, soc: -0.9, ter: 0.0, ext: -0.6, amb: -0.5, aut: -0.9 }, sal: { aut: 1.6, soc: 1.3 } },
  policia: { name: 'Agente de la ley', sector: 'seguridad', lvl: 3, lean: { eco: 0, soc: 0.9, ter: 0.0, ext: 0.6, amb: 0.3, aut: 1.4 }, sal: { ter: 1.6, soc: 1.2, aut: 1.8 } },
  estudiante: { name: 'Estudiante', sector: null, lvl: 2, lean: { eco: -0.6, soc: -1.1, ter: 0.0, ext: -0.8, amb: -1.1, aut: -0.9 }, sal: { soc: 1.5, amb: 1.4, aut: 1.3 } },
  jubilado: { name: 'Jubilado/a', sector: null, lvl: 2, lean: { eco: -0.1, soc: 0.8, ter: 0.0, ext: 0.4, amb: 0.3, aut: 0.6 }, sal: { eco: 1.5, soc: 1.2 } },
  parado: { name: 'Desempleado/a', sector: null, lvl: 1, lean: { eco: -0.9, soc: 0.1, ter: 0.0, ext: 0.4, amb: 0.2, aut: 0.0 }, sal: { eco: 1.8 } },
};
// ---------- Empresas públicas ----------
// Sectores en los que puede haber empresas públicas (las clínicas y colegios públicos son centros; los bancos y las
// constructoras no se pueden nacionalizar ni crear)
const PE_KINDS = ['agricultura', 'ganaderia', 'pesca', 'silvicultura', 'cantera', 'minaMetal', 'minaCarbon', 'alimentacion', 'muebles', 'textil',
  'maquinaria', 'armamento', 'electrica', 'telecom', 'medios', 'gimnasio', 'comercio'];
// Parte del empleo que pueden tener las empresas públicas según la ley del sector público
const PE_LIMIT = [0, 0.05, 0.15, 0.35, 1];
// Situación laboral de cada persona (otra forma de clasificarla, además de su profesión) y cómo tira su ideología
const WORK_SECTORS = {
  privado: { name: 'Sector privado', one: ['Trabaja en la privada', 'Trabaja en la privada'], color: '#e0b84e', icon: 'briefcase', lean: { eco: 0.2 } },
  publico: { name: 'Funcionarios', one: ['Funcionaria', 'Funcionario'], color: '#4fa3e0', icon: 'landmark', lean: { eco: -0.6, soc: -0.2 } },
  parado: { name: 'Desempleados', one: ['Desempleada', 'Desempleado'], color: '#e06a5a', icon: 'user-x' },
  jubilado: { name: 'Jubilados', one: ['Jubilada', 'Jubilado'], color: '#9aa5b1', icon: 'hourglass' },
  estudiante: { name: 'Estudiantes', one: ['Estudiante', 'Estudiante'], color: '#b57be0', icon: 'graduation-cap' },
};
const WORK_SECTOR_IDS = ['jubilado', 'parado', 'privado', 'publico', 'estudiante'];
const workSectorName = (ws, sex) => (WORK_SECTORS[ws] || {}).one ? WORK_SECTORS[ws].one[sex === 'M' ? 0 : 1] : ws;
// Nombre de la profesión según el sexo: «Agricultor/a» → «Agricultora» o «Agricultor»
function profName(prof, sex) {
  const n = (PROFESSIONS[prof] || {}).name || prof;
  return n.replace(/(\S*?)o\/a/, (m, r) => r + (sex === 'M' ? 'a' : 'o')).replace(/(\S+)\/a/, (m, r) => r + (sex === 'M' ? 'a' : ''));
}
// Nombres de los habitantes
const NOMBRES_M = ['Lucía', 'María', 'Carmen', 'Ana', 'Laura', 'Marta', 'Elena', 'Sara', 'Paula', 'Julia', 'Isabel', 'Rosa', 'Pilar', 'Teresa', 'Cristina', 'Nuria', 'Irene', 'Alba', 'Clara', 'Noelia',
  'Raquel', 'Silvia', 'Beatriz', 'Inés', 'Lola', 'Aitana', 'Carla', 'Martina', 'Daniela', 'Valeria', 'Rocío', 'Montse', 'Begoña', 'Ainhoa', 'Uxía', 'Mercedes', 'Dolores', 'Concha', 'Amparo', 'Gloria'];
const NOMBRES_H = ['Antonio', 'Manuel', 'José', 'Javier', 'David', 'Daniel', 'Carlos', 'Miguel', 'Pablo', 'Sergio', 'Jorge', 'Alberto', 'Luis', 'Álvaro', 'Hugo', 'Mario', 'Diego', 'Adrián', 'Iván', 'Rubén',
  'Raúl', 'Óscar', 'Andrés', 'Fernando', 'Ramón', 'Joan', 'Iker', 'Xabier', 'Brais', 'Marc', 'Lucas', 'Leo', 'Martín', 'Bruno', 'Nicolás', 'Francisco', 'Pedro', 'Ángel', 'Julián', 'Enrique'];
const NOMBRES_EXT_M = ['Amara', 'Ingrid', 'Mila', 'Yara', 'Nadia', 'Elsa', 'Aisha', 'Fatima', 'Leila', 'Anja', 'Katarina', 'Olga', 'Mei', 'Yuki', 'Priya', 'Zainab', 'Chiara',
  'Giulia', 'Hanna', 'Astrid', 'Freya', 'Noor', 'Amina', 'Liesel', 'Svetlana', 'Ayumi', 'Adaeze', 'Marisol', 'Thandiwe', 'Ewa'];
const NOMBRES_EXT_H = ['Henrik', 'Lorenzo', 'Pierre', 'Tariq', 'Jonas', 'Olaf', 'Kofi', 'Dmitri', 'Omar', 'Karim', 'Youssef', 'Ivan', 'Lukas', 'Matteo', 'Pavel', 'Kenji',
  'Arjun', 'Emeka', 'Tomasz', 'Niko', 'Sven', 'Mateus', 'Rashid', 'Bogdan', 'Hiroshi', 'Kwame', 'Anders', 'Luca', 'Mehmet', 'Vikram'];
const APELLIDOS = ['García', 'Fernández', 'González', 'Rodríguez', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero',
  'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Serrano', 'Blanco', 'Molina', 'Castro', 'Ortega', 'Rubio', 'Marín', 'Sanz', 'Iglesias', 'Medina', 'Garrido', 'Cortés', 'Castillo',
  'Santos', 'Lozano', 'Guerrero', 'Cano', 'Prieto', 'Méndez', 'Cruz', 'Calvo', 'Gallego', 'Vidal', 'León', 'Herrera', 'Márquez', 'Peña', 'Flores', 'Cabrera', 'Campos', 'Vega', 'Fuentes', 'Carrasco',
  'Diez', 'Caballero', 'Reyes', 'Nieto', 'Aguilar', 'Pascual', 'Santana', 'Herrero', 'Montero', 'Lorenzo', 'Hidalgo', 'Giménez', 'Ibáñez', 'Ferrer', 'Duran', 'Sáez', 'Vicente', 'Arias', 'Etxeberria',
  'Puig', 'Soler', 'Mas', 'Otero', 'Rey', 'Varela', 'Iturbe', 'Garmendia'];
// ---------- Culturas de cada país (para los nombres y la convivencia de los inmigrantes) ----------
// group: familia cultural; las culturas de una misma familia se entienden mejor
const NATION_CULTURES = {
  hispana: { name: 'hispana', group: 'mediterranea', f: NOMBRES_M, m: NOMBRES_H, sn: APELLIDOS },
  latina: { name: 'latina', group: 'mediterranea', f: ['Giulia', 'Chiara', 'Francesca', 'Sofia', 'Camille', 'Élise', 'Margaux', 'Aurora', 'Beatrice', 'Léa', 'Valentina', 'Inès', 'Manon', 'Alessia'],
    m: ['Lorenzo', 'Matteo', 'Luca', 'Pierre', 'Antoine', 'Giacomo', 'Théo', 'Marco', 'Julien', 'Davide', 'Hugo', 'Riccardo', 'Lucien', 'Enzo'],
    sn: ['Rossi', 'Bassi', 'Moreau', 'Lacombe', 'Ferrand', 'Bianchi', 'Romano', 'Colombo', 'Dubois', 'Lefèvre', 'Conti', 'Marchetti', 'Girard', 'Fontaine', 'Ricci', 'Gallo'] },
  helena: { name: 'helena', group: 'mediterranea', f: ['Eleni', 'Maria', 'Katerina', 'Sofia', 'Dimitra', 'Ioanna', 'Anastasia', 'Despina', 'Christina', 'Zoe', 'Athina', 'Vasiliki'],
    m: ['Giorgos', 'Nikos', 'Kostas', 'Dimitris', 'Yannis', 'Christos', 'Panagiotis', 'Vasilis', 'Stavros', 'Alexis', 'Thanos', 'Spyros'],
    sn: ['Papadopoulos', 'Nikolaidis', 'Georgiou', 'Kostas', 'Dimitriou', 'Vlachos', 'Karalis', 'Angelopoulos', 'Mavros', 'Pappas', 'Andreou', 'Galanis', 'Christou', 'Antoniou'] },
  germanica: { name: 'germánica', group: 'norte', f: ['Hanna', 'Liesel', 'Greta', 'Lena', 'Anja', 'Katrin', 'Sabine', 'Mia', 'Johanna', 'Frieda', 'Clara', 'Ursula'],
    m: ['Lukas', 'Jonas', 'Felix', 'Moritz', 'Stefan', 'Tobias', 'Matthias', 'Florian', 'Dieter', 'Klaus', 'Max', 'Paul'],
    sn: ['Weber', 'Müller', 'Schmidt', 'Fischer', 'Lenz', 'Wagner', 'Becker', 'Hoffmann', 'Koch', 'Richter', 'Wolf', 'Schröder', 'Neumann', 'Krüger'] },
  nordica: { name: 'nórdica', group: 'norte', f: ['Ingrid', 'Astrid', 'Freya', 'Elsa', 'Sigrid', 'Linnea', 'Maja', 'Saga', 'Karin', 'Liv', 'Solveig', 'Tove'],
    m: ['Henrik', 'Olaf', 'Sven', 'Anders', 'Lars', 'Erik', 'Magnus', 'Rasmus', 'Bjørn', 'Nils', 'Leif', 'Gunnar'],
    sn: ['Holm', 'Lindqvist', 'Nyberg', 'Ibsen', 'Andersen', 'Hansen', 'Larsen', 'Berg', 'Dahl', 'Lund', 'Nilsson', 'Johansson', 'Strand', 'Eklund'] },
  celta: { name: 'celta', group: 'norte', f: ['Siobhan', 'Aoife', 'Niamh', 'Fiona', 'Brigid', 'Ciara', 'Orla', 'Moira', 'Eilidh', 'Gwen', 'Maeve', 'Rhiannon'],
    m: ['Seán', 'Ciarán', 'Liam', 'Eoin', 'Callum', 'Ewan', 'Rhys', 'Declan', 'Finn', 'Owen', 'Conor', 'Angus'],
    sn: ['Byrne', 'Keane', "O'Brien", 'Murphy', 'Kelly', 'Walsh', 'MacLeod', 'Campbell', 'Evans', 'Davies', 'Gallagher', 'Doyle', 'Fraser', 'Quinn'] },
  eslava: { name: 'eslava', group: 'este', f: ['Katarina', 'Olga', 'Svetlana', 'Ewa', 'Mila', 'Natalia', 'Irina', 'Agnieszka', 'Jelena', 'Zofia', 'Daria', 'Vesna'],
    m: ['Dmitri', 'Ivan', 'Tomasz', 'Bogdan', 'Pavel', 'Marek', 'Nikola', 'Sergei', 'Piotr', 'Milan', 'Andrei', 'Goran'],
    sn: ['Novak', 'Petrov', 'Kowalski', 'Radić', 'Varga', 'Horvat', 'Ivanov', 'Nowak', 'Popović', 'Kovač', 'Smirnov', 'Wiśniewski', 'Dvořák', 'Jovanović'] },
  estepa: { name: 'esteparia', group: 'oriente', f: ['Aigerim', 'Zeynep', 'Aisha', 'Leila', 'Dinara', 'Gulnara', 'Ayşe', 'Madina', 'Nurlan', 'Aliya', 'Elif', 'Saule'],
    m: ['Mehmet', 'Tariq', 'Omar', 'Karim', 'Nursultan', 'Timur', 'Arman', 'Emre', 'Rustam', 'Yusuf', 'Bakyt', 'Kemal'],
    sn: ['Aydın', 'Haddad', 'Nazarbayev', 'Yilmaz', 'Kaya', 'Demir', 'Sultanov', 'Abenov', 'Rahimov', 'Karimov', 'Toktarov', 'Çelik', 'Özdemir', 'Ismailov'] },
  insular: { name: 'isleña', group: 'islas', f: ['Leilani', 'Moana', 'Malia', 'Kalani', 'Aroha', 'Mele', 'Tiare', 'Hina', 'Nalani', 'Losa', 'Ana', 'Sina'],
    m: ['Kai', 'Tane', 'Koa', 'Manu', 'Rangi', 'Sione', 'Tama', 'Nikau', 'Keoni', 'Ari', 'Losi', 'Tevita'],
    sn: ['Fifita', 'Tupou', 'Kealoha', 'Faleolo', 'Tamatea', 'Mahina', 'Akana', 'Taufa', 'Kahale', 'Ngata', 'Lolo', 'Vaai', 'Palakiko', 'Moana'] },
};
// Lo bien que conviven dos familias culturales (1: igual; 0: muy distintas)
const CULTURE_GROUP_COMPAT = {
  mediterranea: { mediterranea: 0.85, norte: 0.6, este: 0.55, oriente: 0.35, islas: 0.4 },
  norte: { mediterranea: 0.6, norte: 0.85, este: 0.6, oriente: 0.3, islas: 0.4 },
  este: { mediterranea: 0.55, norte: 0.6, este: 0.85, oriente: 0.5, islas: 0.35 },
  oriente: { mediterranea: 0.35, norte: 0.3, este: 0.5, oriente: 0.85, islas: 0.35 },
  islas: { mediterranea: 0.4, norte: 0.4, este: 0.35, oriente: 0.35, islas: 0.85 },
};
function cultureCompat(a, b) {
  if (!a || !b || a === b) return 1;
  const A = NATION_CULTURES[a], B = NATION_CULTURES[b];
  return A && B ? CULTURE_GROUP_COMPAT[A.group][B.group] : 0.6;
}
// Qué profesiones trabajan en cada sector (con pesos)
// Qué profesión tiene quien trabaja en cada sector
const SECTOR_PROFESSIONS = {
  agricultura: [['agricultor', 1]], ganaderia: [['agricultor', 1]], pesca: [['pescador', 1]], silvicultura: [['operario', 1]],
  muebles: [['operario', 1]], textil: [['operario', 1]], construccion: [['operario', 1]], finanzas: [['oficinista', 1]],
  canteras: [['operario', 1]], mineria: [['operario', 1]], maquinaria: [['operario', 0.7], ['ingeniero', 0.3]], armamento: [['operario', 0.6], ['ingeniero', 0.4]],
  energia: [['ingeniero', 0.6], ['operario', 0.4]], telecom: [['ingeniero', 1]], medios: [['periodista', 1]], deporte: [['comerciante', 1]], alimentacion: [['operario', 1]], comercio: [['comerciante', 1]], sanidad: [['sanitario', 1]], educacion: [['academico', 1]], seguridad: [['policia', 1]],
};
const LEVEL_NAMES = ['', 'Precario', 'Bajo', 'Medio', 'Medio-alto', 'Alto'];
const LEVEL_MULT = [0, 0.55, 0.8, 1.0, 1.45, 2.6];

// ---------- Nombres ----------
const COUNTRY_NAMES = ['Valdoria', 'Ostrenia', 'Calvaria', 'Merovia', 'Lusitara', 'Brevonia', 'Sardova', 'Kelvoria',
  'Pradesia', 'Vestmark', 'Galtria', 'Montaria', 'Orsenia', 'Drevania', 'Solmara', 'Arvenia', 'Tessalia', 'Norland'];
const CANTON_NAMES = ['Monteluna', 'Riosol', 'Peñaclara', 'Albaterra', 'Vallehondo', 'Marisca', 'Puertoleón', 'Sierranegra',
  'Campoalto', 'Torreblanca', 'Llanoverde', 'Bahía Azul', 'Arenal', 'Roquedal', 'Fuentesanta', 'Olmedal', 'Cabo Norte',
  'Altoplano', 'Ribera Gris', 'Valdeoro', 'Pinarejo', 'Lagomar'];
// ---------- Generador de nombres (con la semilla de la partida) ----------
// Cada país sale de una "familia" lingüística distinta, y los cantones combinan
// plantillas muy diferentes entre sí para que no suenen todos igual.
const NAME_FAMILIES = {
  latina: { a: ['Val', 'Cor', 'Mar', 'Lus', 'Tor', 'Alb', 'Ver', 'Bel', 'Cas', 'Ser', 'Lom', 'Pav'], b: ['', 'e', 'a', 'i', 'en', 'or', 'ar'], c: ['ona', 'ico', 'enza', 'ano', 'eza', 'ulo', 'ena', 'ante', 'osa'] },
  nordica: { a: ['Skar', 'Hal', 'Thor', 'Vest', 'Ulv', 'Grim', 'Sval', 'Ek', 'Bryn', 'Fjel', 'Ask', 'Rav'], b: [''], c: ['heim', 'mark', 'vik', 'rike', 'fjord', 'dal', 'by', 'holm', 'stad'] },
  eslava: { a: ['Brod', 'Kras', 'Mir', 'Vel', 'Drag', 'Zlat', 'Rad', 'Stav', 'Volh', 'Sere', 'Prze', 'Lub'], b: ['', 'o', 'a', 'i'], c: ['ovo', 'ava', 'ica', 'grad', 'ovina', 'ec', 'sk', 'ograd', 'ania'] },
  celta: { a: ['Kil', 'Dun', 'Ard', 'Glen', 'Inver', 'Aber', 'Bally', 'Strath', 'Kin', 'Lis'], b: [''], c: ['more', 'ach', 'ness', 'gal', 'wyn', 'dare', 'carra', 'mor', 'lan'] },
  estepa: { a: ['Kar', 'Tash', 'Ak', 'Bal', 'Sar', 'Tem', 'Oz', 'Kyz', 'Tur', 'Bek'], b: ['', 'a', 'u', 'y'], c: ['abad', 'kent', 'tau', 'khan', 'stán', 'sai', 'kul', 'mir'] },
  insular: { a: ['Ma', 'Ko', 'Ta', 'Nu', 'Pa', 'Re', 'Lo', 'Hi', 'Ka', 'Mo'], b: ['ra', 'lu', 'ke', 'no', 'ti', 'va', 'mo', 'ha'], c: ['a', 'i', 'u', 'ea', 'oa', 'nui', 'tu'] },
  germanica: { a: ['Alt', 'Wolf', 'Eis', 'Linden', 'Hoch', 'Stein', 'Brand', 'Wald', 'Rosen', 'Falk'], b: [''], c: ['burg', 'stein', 'gau', 'berg', 'tal', 'au', 'wald', 'feld', 'mark'] },
  helena: { a: ['Ther', 'Kal', 'Mes', 'Pel', 'Kor', 'Del', 'Ast', 'Eub', 'Myr', 'Lak'], b: ['', 'o', 'a', 'i'], c: ['ída', 'onia', 'ene', 'aris', 'os', 'ópolis', 'akia', 'ía'] },
};
// Une sílabas evitando choques de vocales («Zarlo» + «oz» → «Zarloz»)
function joinSyl(...parts) {
  return parts.reduce((x, y) => (/[aeiouáéíóú]$/i.test(x) && /^[aeiouáéíóú]/i.test(y)) ? x.slice(0, -1) + y : x + y, '');
}
function familyName(fam) {
  const F = NAME_FAMILIES[fam];
  for (let k = 0; k < 20; k++) {
    let w = joinSyl(RNG.pick(F.a), RNG.pick(F.b), RNG.pick(F.c));
    w = w.replace(/([aeiouáéíóú])\1+/gi, '$1').replace(/([^aeiouáéíóúy])\1\1/gi, '$1$1');
    if (w.length >= 4 && w.length <= 12) return w;
  }
  return RNG.pick(F.a) + RNG.pick(F.c);
}
function generateCountryNames(n) {
  const fams = RNG.shuffle(Object.keys(NAME_FAMILIES));
  const out = [];
  for (let i = 0; i < n; i++) { let nm; do { nm = familyName(fams[i % fams.length]); } while (out.includes(nm)); out.push(nm); }
  generateCountryNames.lastFamilies = range(n).map(i => fams[i % fams.length]);
  return out;
}
const CANTON_PARTS = {
  santo: ['San Telmo', 'San Quirico', 'San Leandro', 'San Ciprián', 'Santa Olalla', 'Santa Casilda', 'San Marcial', 'Santa Brígida', 'San Nazario', 'Santa Eulalia'],
  rasgo: ['Puerto', 'Villa', 'Valle', 'Campo', 'Sierra', 'Vega', 'Ribera', 'Torre', 'Castro', 'Puente', 'Monte', 'Llanos', 'Hoz', 'Cuesta', 'Peña', 'Fuente'],
  coletilla: ['del Rey', 'de la Reina', 'del Conde', 'de Arriba', 'del Mar', 'de las Águilas', 'del Pinar', 'de la Sal', 'de Hierro', 'de las Nieves', 'del Obispo', 'de los Lobos', 'de Ultramar'],
  ini: ['Al', 'Ber', 'Cal', 'Es', 'Gua', 'Lor', 'Mon', 'Ol', 'Tar', 'Ur', 'Zar', 'Bal', 'Cu', 'Fu', 'Ja', 'Ne'],
  mid: ['ba', 'ca', 'da', 'la', 'ma', 'ra', 'te', 'ri', 'go', 'lo', 'ne', 'mi'],
  fin: ['ón', 'ena', 'illo', 'eda', 'ar', 'ales', 'uela', 'ejo', 'oz', 'ira', 'ante', 'ín'],
  vasco: [['Itx', 'Arr', 'Goi', 'Zubi', 'Etxe', 'Ur', 'Igel', 'Larr'], ['aga', 'eta', 'ola', 'ondo', 'zar', 'ain', 'egi', 'aldea']],
  catalan: [['Mont', 'Coll', 'Pla', 'Vall', 'Puig', 'Roca', 'Sant Pere de ', 'Torre'], ['roig', 'blanc', 'seca', 'verd', 'ferrer', 'llarg', 'fosc', 'bona']],
  gallego: [['Ou', 'Ri', 'Cer', 'Lou', 'Vi', 'Bea', 'Ce', 'Sar'], ['rense', 'beira', 'ceda', 'ñán', 'xo', 'mil', 'ria', 'lle']],
  adjetivo: ['Real', 'Viejo', 'Mayor', 'de Abajo', 'Nuevo'],
};
function cantonNameFrom(template) {
  const C = CANTON_PARTS, inv = () => joinSyl(RNG.pick(C.ini), RNG.pick(C.mid), RNG.pick(C.fin));
  switch (template) {
    case 'santo': return RNG.pick(C.santo);
    case 'rasgo': return RNG.pick(C.rasgo) + ' ' + RNG.pick(C.coletilla);
    case 'inventado': return inv();
    case 'alto': return RNG.pick(['Alto ', 'Nueva ', 'Bajo ', 'Gran ']) + inv();
    case 'vasco': return joinSyl(RNG.pick(C.vasco[0]), RNG.pick(C.vasco[1]));
    case 'catalan': { const a = RNG.pick(C.catalan[0]); return a.endsWith(' ') ? a + RNG.pick(['Mar', 'Riu', 'Bosc', 'Camp']) : a + RNG.pick(C.catalan[1]); }
    case 'gallego': return joinSyl(RNG.pick(C.gallego[0]), RNG.pick(C.gallego[1]));
    default: return inv() + ' ' + RNG.pick(C.adjetivo);
  }
}
function generateCantonNames(n) {
  const templates = RNG.shuffle(['santo', 'rasgo', 'inventado', 'alto', 'vasco', 'catalan', 'gallego', 'adjetivo', 'rasgo', 'inventado']);
  const out = [];
  for (let i = 0; i < n; i++) {
    let nm, k = 0;
    do { nm = cantonNameFrom(templates[i % templates.length]); k++; } while (k < 30 && (out.includes(nm) || out.some(o => o.split(' ')[0] === nm.split(' ')[0])));
    out.push(nm);
  }
  return out;
}
const FOREIGN_PALETTE = ['#c99a5b', '#7fae8e', '#a98bc4', '#6f9fc9', '#c97b6d', '#c4b45a', '#6fb7b4', '#b27fa0'];

// Paleta de los partidos: 24 colores bien diferenciados (además, se puede elegir uno a medida)
const PARTY_COLORS = [
  { hex: '#d62839', name: 'Rojo' }, { hex: '#9e1b32', name: 'Granate' }, { hex: '#e8702a', name: 'Naranja' }, { hex: '#f2a541', name: 'Mandarina' },
  { hex: '#f2c230', name: 'Amarillo' }, { hex: '#c9b458', name: 'Mostaza' }, { hex: '#9bc53d', name: 'Lima' }, { hex: '#3aa655', name: 'Verde' },
  { hex: '#1b6b45', name: 'Verde bosque' }, { hex: '#1f9e89', name: 'Turquesa' }, { hex: '#3cc4d6', name: 'Celeste' }, { hex: '#2b7bd6', name: 'Azul' },
  { hex: '#1b2f6b', name: 'Azul marino' }, { hex: '#5b5fc7', name: 'Índigo' }, { hex: '#7b3fa0', name: 'Morado' }, { hex: '#b06ab3', name: 'Lila' },
  { hex: '#e05aa0', name: 'Rosa' }, { hex: '#f28ca8', name: 'Rosa pálido' }, { hex: '#6b4226', name: 'Marrón' }, { hex: '#a8763e', name: 'Ocre' },
  { hex: '#5c6670', name: 'Gris' }, { hex: '#9aa5b1', name: 'Plata' }, { hex: '#1a1a1a', name: 'Negro' }, { hex: '#f5f5f0', name: 'Blanco' },
];
// Partidos de partida de los tres primeros jugadores (cada uno puede cambiarlos al fundar el suyo)
const DEFAULT_PARTIES = [
  { name: 'Partido Demócrata', short: 'PD', color: '#d62839' },
  { name: 'Partido Independiente', short: 'PI', color: '#2b7bd6' },
  { name: 'Partido del Centro', short: 'PC', color: '#3aa655' },
];
const LOGO_SHAPES = [
  { id: 'circle', name: 'Círculo' }, { id: 'rounded', name: 'Cuadrado redondeado' }, { id: 'square', name: 'Cuadrado' }, { id: 'shield', name: 'Escudo' },
  { id: 'hexagon', name: 'Hexágono' }, { id: 'octagon', name: 'Octógono' }, { id: 'diamond', name: 'Rombo' }, { id: 'flag', name: 'Banderín' },
  { id: 'arch', name: 'Arco' }, { id: 'ring', name: 'Anillo' }, { id: 'rays', name: 'Sol' }, { id: 'wreath', name: 'Corona de laurel' },
];
const CANDIDATE_NAMES = ['Lucía Ferrer', 'Andrés Molina', 'Carmen Ibarra', 'Tomás Vidal', 'Elena Santos', 'Rubén Calvo', 'Inés Navarro',
  'Marcos Prieto', 'Sara Lozano', 'Diego Herrera', 'Paula Romero', 'Iván Gallego', 'Nuria Peña', 'Óscar Benítez', 'Alba Cortés', 'Héctor Marín'];
// ============================================================
//  DEBATE INICIAL: bloques y preguntas
//  Cada respuesta tiene fx: {eje: posición} (de -2 a +2). Cada pregunta tiene 8 respuestas:
//  en cada partida se muestran tantas como partidos haya más una (siempre una de cada extremo).
// ============================================================
const DEBATE_BLOCKS = [
  { axis: 'eco', title: 'Bloque económico', questions: [
    { q: 'Hablemos de impuestos. ¿Qué propone su partido?', a: [
      { t: 'Los impuestos deben bajar: el dinero está mejor en el bolsillo de la gente.', fx: { eco: 1.5 } },
      { t: 'Hay que proteger los servicios públicos, aunque cueste subir impuestos.', fx: { eco: -1.5 } },
      { t: 'Los cantones deberían gestionar sus propios impuestos.', fx: { eco: 0, ter: 1.5 } },
      { t: 'Que paguen más quienes más tienen: un gran impuesto a las fortunas.', fx: { eco: -2 } },
      { t: 'Un tipo único y bajo para todos: sencillo y sin trampas.', fx: { eco: 2 } },
      { t: 'Ni subir ni bajar: perseguir el fraude fiscal antes de tocar nada.', fx: { eco: -0.3, aut: 0.3 } },
      { t: 'Bajar el IVA de lo básico y compensarlo con impuestos verdes.', fx: { eco: -0.5, amb: -1 } },
      { t: 'Rebajas fiscales para las familias con hijos.', fx: { eco: 0.5, soc: 1 } } ] },
    { q: 'El paro juvenil está disparado. ¿Cuál es su receta?', a: [
      { t: 'Flexibilizar la contratación y reducir las cotizaciones de las empresas.', fx: { eco: 2 } },
      { t: 'Un plan público de empleo garantizado para todos los jóvenes.', fx: { eco: -2 } },
      { t: 'Formación profesional dual pactada con empresas y sindicatos.', fx: { eco: 0 } },
      { t: 'Ayudas a los jóvenes que monten su propio negocio.', fx: { eco: 1 } },
      { t: 'Reducir la jornada a 32 horas para repartir el trabajo.', fx: { eco: -1.5, soc: -0.5 } },
      { t: 'Prioridad a los nacionales en las contrataciones.', fx: { eco: 0, ext: 1.8 } },
      { t: 'Un servicio cívico obligatorio que les dé experiencia.', fx: { eco: 0, aut: 1, soc: 0.5 } },
      { t: 'Becas para que se formen fuera y vuelvan con experiencia.', fx: { eco: -0.5, ext: -1 } } ] },
    { q: '¿Qué hacemos con las grandes compañías energéticas?', a: [
      { t: 'Nacionalizarlas: la energía es un bien común.', fx: { eco: -2, amb: -0.5 } },
      { t: 'Más competencia: el libre mercado bajará los precios.', fx: { eco: 1.5 } },
      { t: 'Limitar sus márgenes y apoyar cooperativas energéticas locales.', fx: { eco: -0.5, amb: -1 } },
      { t: 'Una empresa pública que compita con las privadas.', fx: { eco: -1 } },
      { t: 'Bajarles los impuestos para que inviertan aquí.', fx: { eco: 2, amb: 0.5 } },
      { t: 'Un impuesto extraordinario a sus beneficios caídos del cielo.', fx: { eco: -1.2 } },
      { t: 'Autosuficiencia energética, aunque salga más cara.', fx: { eco: 0, ext: 1.5, amb: 0.5 } },
      { t: 'Que cada cantón tenga su propia compañía energética.', fx: { eco: -0.5, ter: 1.2 } } ] },
    { q: '¿Y el salario mínimo?', a: [
      { t: 'Subirlo hasta el 60 % del salario medio.', fx: { eco: -1 } },
      { t: 'Eliminarlo: los salarios los fija el mercado.', fx: { eco: 2 } },
      { t: 'Actualizarlo con la inflación, sin sobresaltos.', fx: { eco: 0.5 } },
      { t: 'Que lo pacten sindicatos y patronal en cada sector.', fx: { eco: 0.2 } },
      { t: 'Un salario máximo para los directivos, ligado al mínimo.', fx: { eco: -2 } },
      { t: 'Congelarlo hasta que baje el paro.', fx: { eco: 1.4 } },
      { t: 'Uno distinto en cada cantón, según su coste de vida.', fx: { eco: 0.5, ter: 1 } },
      { t: 'Subirlo y compensar a las pymes con rebajas de cotizaciones.', fx: { eco: -0.5 } } ] },
    { q: 'Los alquileres no paran de subir. ¿Qué propone?', a: [
      { t: 'Topar el precio del alquiler por ley.', fx: { eco: -1.5 } },
      { t: 'Liberalizar suelo y construir más; eso abaratará la vivienda.', fx: { eco: 1.5, amb: 1 } },
      { t: 'Un gran parque público de vivienda en alquiler social.', fx: { eco: -1 } },
      { t: 'Ayudas directas a los jóvenes para pagar el alquiler.', fx: { eco: -0.5 } },
      { t: 'Expropiar los pisos vacíos de los grandes propietarios.', fx: { eco: -2, aut: 0.5 } },
      { t: 'Seguridad para los propietarios: desalojos rápidos de okupas.', fx: { eco: 1.2, aut: 1 } },
      { t: 'Limitar los pisos turísticos.', fx: { eco: -0.5, soc: 0.3 } },
      { t: 'Bajar los impuestos a quien alquile barato.', fx: { eco: 0.8 } } ] },
  ] },
  { axis: 'soc', title: 'Bloque social', questions: [
    { q: '¿Qué papel debe tener la religión en la escuela?', a: [
      { t: 'Ninguno: escuela laica.', fx: { soc: -1.5 } },
      { t: 'La religión forma parte de nuestra identidad y debe enseñarse.', fx: { soc: 1.5 } },
      { t: 'Optativa: que decidan las familias.', fx: { soc: 0 } },
      { t: 'Historia de las religiones, sin catequesis.', fx: { soc: -0.5 } },
      { t: 'Enseñar la religión mayoritaria y financiar los colegios religiosos.', fx: { soc: 2 } },
      { t: 'Quitar los símbolos religiosos de todos los edificios públicos.', fx: { soc: -2 } },
      { t: 'Que lo decida cada cantón.', fx: { soc: 0, ter: 1 } },
      { t: 'Ética y valores cívicos para todos, obligatoria.', fx: { soc: -0.8, aut: 0.5 } } ] },
    { q: 'Hablemos de la familia.', a: [
      { t: 'Defender la familia tradicional como pilar de la sociedad.', fx: { soc: 2 } },
      { t: 'Todas las formas de familia merecen la misma protección.', fx: { soc: -1 } },
      { t: 'La familia es una construcción social; hay que superar las categorías.', fx: { soc: -2 } },
      { t: 'Cheque bebé y ayudas a la natalidad.', fx: { soc: 1, eco: -0.5 } },
      { t: 'Permisos de paternidad iguales e intransferibles.', fx: { soc: -1, eco: -0.3 } },
      { t: 'El Estado no debe meterse en cómo vive cada familia.', fx: { soc: -0.3, eco: 1, aut: -0.5 } },
      { t: 'Descuentos en todo para las familias numerosas.', fx: { soc: 1.5 } },
      { t: 'Escuelas infantiles públicas y gratuitas de cero a tres años.', fx: { soc: -0.5, eco: -1 } } ] },
    { q: '¿Debe legalizarse la eutanasia?', a: [
      { t: 'Sí: es un derecho a morir dignamente, con garantías.', fx: { soc: -1 } },
      { t: 'No: la vida es sagrada.', fx: { soc: 2 } },
      { t: 'Que lo decida la ciudadanía en referéndum.', fx: { soc: 0 } },
      { t: 'Sí, y también el suicidio asistido, sin tantas trabas.', fx: { soc: -2 } },
      { t: 'Antes que eso, cuidados paliativos para todos.', fx: { soc: 0.8 } },
      { t: 'Con objeción de conciencia para los médicos.', fx: { soc: 0.5 } },
      { t: 'Que la regule cada cantón.', fx: { soc: 0, ter: 1 } },
      { t: 'Solo en enfermedades terminales y con el visto bueno de varios médicos.', fx: { soc: -0.3 } } ] },
    { q: '¿Qué política propone sobre las drogas?', a: [
      { t: 'Legalizar y regular el cannabis, y cobrar impuestos por ello.', fx: { soc: -1.5, eco: 0.5 } },
      { t: 'Tolerancia cero.', fx: { soc: 1.5, aut: 1 } },
      { t: 'Despenalizar el consumo y perseguir el tráfico.', fx: { soc: -0.5 } },
      { t: 'Legalizarlas todas y tratar la adicción como un problema de salud.', fx: { soc: -2, aut: -1 } },
      { t: 'Cannabis medicinal, sí; recreativo, no.', fx: { soc: 0.3 } },
      { t: 'Cárcel para los traficantes y tratamiento obligatorio para los adictos.', fx: { soc: 1.8, aut: 1.5 } },
      { t: 'Campañas de prevención en los colegios.', fx: { soc: 0.5 } },
      { t: 'Que se vendan en farmacias públicas y el dinero vaya a sanidad.', fx: { soc: -1, eco: -1 } } ] },
    { q: 'Las fiestas tradicionales con animales, ¿cultura o maltrato?', a: [
      { t: 'Son cultura y tradición: hay que protegerlas.', fx: { soc: 1.5 } },
      { t: 'Hay que prohibirlas de inmediato.', fx: { soc: -1.5, amb: -0.5 } },
      { t: 'Que decida cada municipio.', fx: { soc: 0, ter: 0.5 } },
      { t: 'Declararlas patrimonio y subvencionarlas.', fx: { soc: 2 } },
      { t: 'Mantenerlas, pero sin muerte del animal.', fx: { soc: 0 } },
      { t: 'Prohibir también la caza y los zoológicos.', fx: { soc: -2, amb: -1.5 } },
      { t: 'Que no se pague ni un euro público por ellas.', fx: { soc: -0.8, eco: 0.5 } },
      { t: 'Que las regule cada cantón: son parte de su cultura.', fx: { soc: 0.5, ter: 1.2 } } ] },
  ] },
  { axis: 'ter', title: 'Bloque territorial', questions: [
    { q: 'Algunos cantones piden más autogobierno. ¿Qué responde?', a: [
      { t: 'Que cada cantón pueda decidir su futuro, incluso la independencia.', fx: { ter: 2 } },
      { t: 'Un Estado federal con cantones fuertes.', fx: { ter: 1 } },
      { t: 'La unidad nacional no se negocia.', fx: { ter: -2 } },
      { t: 'Más competencias, pero dentro del marco actual.', fx: { ter: 0.5 } },
      { t: 'El sistema actual funciona: no hay que tocarlo.', fx: { ter: -0.5 } },
      { t: 'Devolver competencias al Estado: el autogobierno ha fracasado.', fx: { ter: -1.5 } },
      { t: 'Consultas pactadas en los cantones que lo pidan.', fx: { ter: 1.5, aut: -0.5 } },
      { t: 'Suspender el autogobierno de quien desafíe la ley.', fx: { ter: -2, aut: 1.5 } } ] },
    { q: '¿Qué hacemos con las lenguas cantonales?', a: [
      { t: 'Cooficialidad y escuela en lengua propia.', fx: { ter: 1.5 } },
      { t: 'Una sola lengua oficial para todo el país.', fx: { ter: -2, soc: 0.5 } },
      { t: 'Bilingüismo voluntario.', fx: { ter: 0 } },
      { t: 'Que la lengua propia sea la única vehicular en su cantón.', fx: { ter: 2 } },
      { t: 'Libertad de las familias para elegir la lengua de la escuela.', fx: { ter: -0.8, aut: -0.3 } },
      { t: 'Protegerlas como patrimonio, sin imponerlas.', fx: { ter: 0.5 } },
      { t: 'Exigir la lengua común para cualquier empleo público.', fx: { ter: -1.5 } },
      { t: 'Que todos los escolares aprendan alguna lengua cantonal.', fx: { ter: 1 } } ] },
    { q: 'Los cantones ricos aportan más a la caja común. ¿Es justo?', a: [
      { t: 'Sí: solidaridad, quien más tiene más aporta.', fx: { ter: -0.5, eco: -1 } },
      { t: 'No: cada cantón debe quedarse con lo que recauda.', fx: { ter: 2, eco: 0.5 } },
      { t: 'Solidaridad, sí, pero con límites.', fx: { ter: 0.5 } },
      { t: 'Una caja única: el Estado recauda y reparte por igual.', fx: { ter: -1.8, eco: -0.5 } },
      { t: 'Publicar las balanzas fiscales y debatir con datos.', fx: { ter: 0.3 } },
      { t: 'Más dinero para los cantones pobres y despoblados.', fx: { ter: -0.5, eco: -1.5 } },
      { t: 'Concierto económico para todo cantón que lo quiera.', fx: { ter: 1.5, eco: 0.5 } },
      { t: 'Menos transferencias: que cada cantón aprenda a gastar mejor.', fx: { ter: 0, eco: 1.5 } } ] },
    { q: '¿Qué bandera debe ondear en los edificios públicos?', a: [
      { t: 'Solo la bandera nacional.', fx: { ter: -2 } },
      { t: 'Ambas, siempre.', fx: { ter: 0 } },
      { t: 'La que decida cada parlamento cantonal.', fx: { ter: 1.5 } },
      { t: 'Banderas, las justas: lo importante es gestionar.', fx: { ter: 0, soc: -0.5 } },
      { t: 'Multar a quien no ondee la bandera nacional.', fx: { ter: -2, aut: 1.2 } },
      { t: 'La cantonal, siempre en el lugar de honor en su cantón.', fx: { ter: 1 } },
      { t: 'Fuera todas las banderas de los edificios públicos.', fx: { ter: 0.5, soc: -1 } },
      { t: 'La nacional, más grande y en el centro.', fx: { ter: -1.2 } } ] },
    { q: '¿Sobran administraciones?', a: [
      { t: 'Sí: suprimamos los parlamentos cantonales.', fx: { ter: -2, eco: 1 } },
      { t: 'Hay que trasladar instituciones a otros cantones.', fx: { ter: 0.5 } },
      { t: 'La capital debe seguir siendo el motor del país.', fx: { ter: -1 } },
      { t: 'Sobran ministerios: que sus competencias pasen a los cantones.', fx: { ter: 1.5 } },
      { t: 'Fusionar los cantones pequeños para ahorrar.', fx: { ter: -1, eco: 0.8 } },
      { t: 'Ni una administración menos: son empleo público.', fx: { ter: 0.3, eco: -1 } },
      { t: 'Que el Senado sea una verdadera cámara de los cantones.', fx: { ter: 1 } },
      { t: 'Ventanilla única: una sola administración por trámite.', fx: { ter: -0.3, eco: 0.5 } } ] },
  ] },
  { axis: 'ext', title: 'Bloque internacional', questions: [
    { q: '¿Qué opina del libre comercio?', a: [
      { t: 'Libre comercio con todo el mundo.', fx: { ext: -1.5, eco: 1 } },
      { t: 'Aranceles para proteger nuestra industria.', fx: { ext: 1.5 } },
      { t: 'Solo acuerdos con países que respeten los derechos laborales.', fx: { ext: -0.5, eco: -0.5 } },
      { t: 'Tratados con nuestros vecinos, pero no con todo el mundo.', fx: { ext: 0 } },
      { t: 'Cerrar las fronteras comerciales: autosuficiencia total.', fx: { ext: 2, eco: -0.5 } },
      { t: 'Proteger solo la agricultura; el resto, abierto.', fx: { ext: 0.5, eco: 0.5 } },
      { t: 'Aranceles verdes a quien contamine más que nosotros.', fx: { ext: 0.5, amb: -1 } },
      { t: 'Un mercado único con los vecinos, y una moneda común.', fx: { ext: -2 } } ] },
    { q: 'Inmigración: ¿qué política defiende?', a: [
      { t: 'Fronteras abiertas: ninguna persona es ilegal.', fx: { ext: -2, soc: -1 } },
      { t: 'Inmigración ordenada según las necesidades del mercado laboral.', fx: { ext: 0, eco: 0.5 } },
      { t: 'Cerrar fronteras y priorizar a los nacionales.', fx: { ext: 2, soc: 1 } },
      { t: 'Regularizar a todos los que ya viven aquí.', fx: { ext: -1.5, soc: -0.5 } },
      { t: 'Inmigración por puntos, como otros países.', fx: { ext: 0.5, eco: 0.8 } },
      { t: 'Expulsar a quien cometa delitos.', fx: { ext: 1.2, aut: 1 } },
      { t: 'Repartir a los recién llegados entre todos los cantones.', fx: { ext: -0.5, ter: -1 } },
      { t: 'Que cada cantón decida cuántos inmigrantes acoge.', fx: { ext: 0.5, ter: 1.2 } } ] },
    { q: '¿Debemos integrarnos en organizaciones supranacionales?', a: [
      { t: 'Sí, y cederles soberanía.', fx: { ext: -2 } },
      { t: 'Cooperar, pero sin ceder competencias.', fx: { ext: 0.5 } },
      { t: 'Salir de todas: aquí decidimos nosotros.', fx: { ext: 2 } },
      { t: 'Entrar, pero con referéndum previo.', fx: { ext: -0.5, aut: -0.5 } },
      { t: 'Solo en las de defensa, para estar protegidos.', fx: { ext: 0, ter: -0.5 } },
      { t: 'Que los cantones también tengan voz en ellas.', fx: { ext: -1, ter: 1.2 } },
      { t: 'Seguir dentro, pero renegociar todos los tratados.', fx: { ext: 1 } },
      { t: 'Liderarlas: queremos un papel protagonista.', fx: { ext: -1.2, aut: 0.3 } } ] },
    { q: 'Un fondo extranjero quiere comprar una empresa estratégica.', a: [
      { t: 'Bienvenido el capital, venga de donde venga.', fx: { ext: -1, eco: 1.5 } },
      { t: 'Hay que vetarlo: la soberanía económica es lo primero.', fx: { ext: 1.5 } },
      { t: 'Analizar caso a caso.', fx: { ext: 0 } },
      { t: 'Que el Estado entre en el capital y la compre él.', fx: { ext: 1, eco: -1.5 } },
      { t: 'Bienvenido, si se compromete a mantener el empleo.', fx: { ext: -0.5, eco: 0.3 } },
      { t: 'Que los trabajadores puedan comprarla primero.', fx: { ext: 0.5, eco: -1 } },
      { t: 'Que el cantón donde está tenga derecho de veto.', fx: { ext: 0.5, ter: 1.2 } },
      { t: 'Ninguna empresa nuestra en manos extranjeras.', fx: { ext: 2 } } ] },
    { q: 'Estalla un conflicto en un país vecino. ¿Qué hacemos?', a: [
      { t: 'Mediación diplomática y acogida de refugiados.', fx: { ext: -1.5, soc: -0.5 } },
      { t: 'Neutralidad absoluta: no es nuestro problema.', fx: { ext: 1 } },
      { t: 'Apoyo militar a nuestros aliados.', fx: { ext: -0.5, ter: -0.5 } },
      { t: 'Sanciones económicas al agresor.', fx: { ext: -1 } },
      { t: 'Cerrar la frontera para que no nos salpique.', fx: { ext: 2 } },
      { t: 'Ayuda humanitaria, nunca armas.', fx: { ext: -1, soc: -0.5 } },
      { t: 'Aprovechar para vender nuestras armas.', fx: { ext: 0.5, eco: 1.5 } },
      { t: 'Subir ya el gasto en defensa.', fx: { ext: 1, aut: 0.8, ter: -0.6 } } ] },
  ] },
  { axis: 'aut', title: 'Bloque de autoridad y libertades', questions: [
    { q: 'Tras unos disturbios, ¿qué hacemos con las manifestaciones?', a: [
      { t: 'El derecho de protesta es sagrado: ninguna restricción.', fx: { aut: -1.5 } },
      { t: 'Prohibir las que alteren el orden y endurecer las sanciones.', fx: { aut: 1.5 } },
      { t: 'Garantizarlo con comunicación previa y cauces claros.', fx: { aut: 0 } },
      { t: 'Multas solo a quien cause daños.', fx: { aut: 0.3 } },
      { t: 'Disolver la policía antidisturbios.', fx: { aut: -2 } },
      { t: 'Prohibir las que ofendan a las instituciones.', fx: { aut: 2 } },
      { t: 'Zonas protegidas alrededor del Parlamento.', fx: { aut: 1 } },
      { t: 'Hablar con los convocantes antes de intervenir.', fx: { aut: -0.8 } } ] },
    { q: '¿Debe la policía poder vigilar las comunicaciones sin orden judicial?', a: [
      { t: 'Sí, si es para prevenir delitos graves o terrorismo.', fx: { aut: 1.8 } },
      { t: 'Jamás: la privacidad es intocable.', fx: { aut: -1.5 } },
      { t: 'Solo con autorización judicial y control parlamentario.', fx: { aut: -0.3 } },
      { t: 'Cámaras con reconocimiento facial en todas las calles.', fx: { aut: 2 } },
      { t: 'Prohibir que las empresas vendan nuestros datos.', fx: { aut: -1, eco: -0.5 } },
      { t: 'Una agencia independiente que controle a los espías.', fx: { aut: -0.8 } },
      { t: 'Poder intervenir las redes sociales de los sospechosos.', fx: { aut: 1.2 } },
      { t: 'Cifrado libre para todos: nadie debe leer nuestros mensajes.', fx: { aut: -2 } } ] },
    { q: '¿Cómo deben elegirse los jueces?', a: [
      { t: 'Que los elijan los propios jueces: independencia total.', fx: { aut: -1 } },
      { t: 'Que los nombre el Gobierno, que para eso lo eligió el pueblo.', fx: { aut: 1.8 } },
      { t: 'Un sistema mixto con mayorías amplias en el Parlamento.', fx: { aut: 0 } },
      { t: 'Que los elija el pueblo en las urnas.', fx: { aut: -0.5 } },
      { t: 'Que los elija el Parlamento por mayoría simple.', fx: { aut: 1 } },
      { t: 'Jurados populares para todos los delitos graves.', fx: { aut: -1.5 } },
      { t: 'Que cada cantón elija sus propios tribunales.', fx: { aut: -0.3, ter: 1.2 } },
      { t: 'Un tribunal especial para los delitos contra el Estado.', fx: { aut: 2, ter: -0.8 } } ] },
    { q: '¿Qué opina de los decretos del Gobierno sin pasar por el Parlamento?', a: [
      { t: 'Un Gobierno fuerte necesita gobernar por decreto cuando hace falta.', fx: { aut: 1.8 } },
      { t: 'Solo en emergencias reales y con control posterior.', fx: { aut: 0 } },
      { t: 'Hay que limitarlos al máximo y decidir más por referéndum.', fx: { aut: -1.5 } },
      { t: 'Que el Parlamento los pueda tumbar en una semana.', fx: { aut: -0.5 } },
      { t: 'Decretos en materia económica, sí.', fx: { aut: 1, eco: 0.8 } },
      { t: 'Prohibirlos: todo debe pasar por el Parlamento.', fx: { aut: -1.2 } },
      { t: 'Que necesiten el aval de los cantones.', fx: { aut: -0.5, ter: 1 } },
      { t: 'Un estado de excepción permanente contra el crimen.', fx: { aut: 2, soc: 0.5 } } ] },
    { q: '¿Y los medios de comunicación públicos?', a: [
      { t: 'Al servicio del Gobierno elegido.', fx: { aut: 1.8 } },
      { t: 'Independientes y con un consejo plural.', fx: { aut: -0.5 } },
      { t: 'Privatizarlos: el Estado no debe tener medios.', fx: { aut: -0.8, eco: 1.2 } },
      { t: 'Que los dirija un consejo elegido por sus trabajadores.', fx: { aut: -1.2, eco: -0.8 } },
      { t: 'Más medios públicos en cada cantón.', fx: { aut: 0, ter: 1.2 } },
      { t: 'Cerrar los medios que difundan bulos.', fx: { aut: 1.5 } },
      { t: 'Ayudas públicas a la prensa local.', fx: { aut: -0.3, eco: -0.5 } },
      { t: 'Que el Gobierno nombre al director, como siempre.', fx: { aut: 1 } } ] },
  ] },
  { axis: 'amb', title: 'Bloque medioambiental', questions: [
    { q: '¿Cómo afrontamos el cambio climático?', a: [
      { t: 'Emergencia climática: neutralidad de carbono en diez años.', fx: { amb: -2 } },
      { t: 'Transición gradual sin destruir empleo.', fx: { amb: 0 } },
      { t: 'Las regulaciones climáticas frenan el progreso.', fx: { amb: 1.5, eco: 0.5 } },
      { t: 'Un gran plan de renovables con dinero público.', fx: { amb: -1.2, eco: -0.8 } },
      { t: 'Que lo resuelva la tecnología, no las prohibiciones.', fx: { amb: 0.8, eco: 0.5 } },
      { t: 'Que actúen primero los que más contaminan.', fx: { amb: 1, ext: 0.8 } },
      { t: 'Un ministerio de transición con poder de veto.', fx: { amb: -1.5, aut: 0.5 } },
      { t: 'Ni un euro: el clima siempre ha cambiado.', fx: { amb: 2 } } ] },
    { q: 'Una empresa quiere abrir una mina en un espacio natural.', a: [
      { t: 'Adelante: empleo y riqueza.', fx: { amb: 2 } },
      { t: 'Ni hablar: la naturaleza no se vende.', fx: { amb: -1.5 } },
      { t: 'Sí, con compensación ambiental estricta.', fx: { amb: 0.5 } },
      { t: 'Que decidan los vecinos en consulta.', fx: { amb: -0.5, aut: -0.5 } },
      { t: 'Sí, pero pública: que los beneficios se queden aquí.', fx: { amb: 1, eco: -1 } },
      { t: 'Que lo decida el cantón donde está.', fx: { amb: 0, ter: 1.2 } },
      { t: 'Ampliar el espacio natural para blindarlo.', fx: { amb: -2 } },
      { t: 'Sí, con rebajas fiscales para que venga rápido.', fx: { amb: 1.5, eco: 1 } } ] },
    { q: '¿Qué hacemos con la energía nuclear?', a: [
      { t: 'Cerrar todas las centrales.', fx: { amb: -1.5 } },
      { t: 'Más nucleares: energía limpia y estable.', fx: { amb: 0.5, ext: 0.5 } },
      { t: 'Apostar por el gas importado y las centrales de carbón.', fx: { amb: 2 } },
      { t: 'Alargar la vida de las que hay mientras crecen las renovables.', fx: { amb: 0 } },
      { t: 'Investigar la fusión nuclear con dinero público.', fx: { amb: -0.3, eco: -0.5 } },
      { t: 'Cerrarlas y apostar por el autoconsumo solar.', fx: { amb: -2 } },
      { t: 'Que el cantón que tenga una central cobre por ella.', fx: { amb: 0.5, ter: 1 } },
      { t: 'Volver al carbón nacional: empleo y soberanía.', fx: { amb: 2, ext: 1 } } ] },
    { q: '¿Y el coche en las ciudades?', a: [
      { t: 'Prohibir los coches de combustión en el centro.', fx: { amb: -1.5, soc: -0.5 } },
      { t: 'El coche es libertad: no a las restricciones.', fx: { amb: 1.5, soc: 0.5 } },
      { t: 'Ayudas para renovar el parque de vehículos.', fx: { amb: -0.5 } },
      { t: 'Transporte público gratuito.', fx: { amb: -1, eco: -1 } },
      { t: 'Peajes urbanos para entrar al centro.', fx: { amb: -1, eco: 0.5 } },
      { t: 'Más carreteras y aparcamientos.', fx: { amb: 2 } },
      { t: 'Carriles bici en todas las ciudades.', fx: { amb: -1.2 } },
      { t: 'Que lo decida cada ayuntamiento.', fx: { amb: 0, ter: 0.5 } } ] },
    { q: 'La sequía aprieta. ¿Qué hacemos con el agua?', a: [
      { t: 'Trasvases entre cantones para el regadío.', fx: { amb: 1, ter: -1 } },
      { t: 'El agua es de cada cuenca: ni un trasvase.', fx: { amb: -0.5, ter: 1 } },
      { t: 'Desaladoras y reutilización.', fx: { amb: 0 } },
      { t: 'Restringir el regadío intensivo.', fx: { amb: -1.5 } },
      { t: 'Nuevos embalses en todo el país.', fx: { amb: 2, ter: -0.5 } },
      { t: 'Que pague más quien más consume.', fx: { amb: -1, eco: 0.5 } },
      { t: 'Prioridad absoluta para el campo.', fx: { amb: 1.2 } },
      { t: 'Una autoridad nacional del agua.', fx: { amb: 0, ter: -1.5 } } ] },
  ] },
];
// Respuestas regionalistas: aparecen en todos los bloques para los partidos que pueden serlo.
// Elegir una convierte al partido en regionalista de esa cultura ({R}).
const REGIONAL_ANSWERS = {
  eco: { t: 'Lo que se recauda en {R} debe quedarse en {R}: queremos nuestro propio concierto económico.', fx: { eco: 0.3, ter: 1.8 } },
  soc: { t: 'Nuestra lengua y nuestras tradiciones son lo primero: {R} no es una región más.', fx: { soc: 0.2, ter: 1.8 } },
  ter: { t: '{R} es una nación y tiene derecho a decidir su futuro.', fx: { ter: 2 } },
  ext: { t: '{R} merece voz propia en el mundo, con sus propias delegaciones.', fx: { ext: -0.5, ter: 1.6 } },
  aut: { t: 'El autogobierno de {R} es la mejor garantía de nuestras libertades.', fx: { aut: -0.6, ter: 1.6 } },
  amb: { t: 'Nuestra tierra, nuestras reglas: {R} decidirá cómo cuidar su territorio.', fx: { amb: -0.4, ter: 1.6 } },
};

// ============================================================
//  LEYES MARCO
//  Cada ley marco (paquete) agrupa varios campos. Una propuesta
//  puede cambiar uno o varios campos de la misma ley a la vez.
//  Campo: path (variable de política), options, label(v), pos(v)
//  (posición ideológica de esa opción), organic (mayoría absoluta).
// ============================================================
const pctLbl = v => (Math.round(v * 10000) / 100).toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' %';
const LEVEL5 = ['Muy bajo', 'Bajo', 'Estándar', 'Alto', 'Muy alto'];
const lvlLbl = v => LEVEL5[[0.8, 0.9, 1, 1.1, 1.25].indexOf(v)] || (Math.round(v * 100) + ' %');
const FIELD_LIST = [
  // --- Ley electoral ---
  { id: 'sistemaElectoral', name: 'Sistema electoral', path: 'sistemaElectoral', organic: true,
    options: ['dhondt_canton', 'proporcional_nacional', 'mayoritario'],
    label: v => ({ dhondt_canton: 'Proporcional por cantones (D\'Hondt)', proporcional_nacional: 'Proporcional en circunscripción única', mayoritario: 'Mayoritario (distritos de un escaño)' })[v],
    pos: () => ({}), desc: 'Cómo se convierten los votos en escaños. El mayoritario premia a los grandes; la circunscripción única, a los pequeños.' },
  { id: 'umbral', name: 'Umbral electoral', path: 'umbral', organic: true, options: [0, 0.03, 0.05, 0.10],
    label: v => v === 0 ? 'Sin umbral' : pctLbl(v), pos: () => ({}), desc: 'Porcentaje mínimo de voto para obtener escaños.' },
  { id: 'edadVoto', name: 'Edad mínima para votar', path: 'edadVoto', organic: true, options: [16, 18],
    label: v => v + ' años', pos: v => ({ soc: v === 16 ? -0.6 : 0.3 }), desc: 'Votar a los 16 amplía el censo con votantes muy jóvenes.' },
  { id: 'votoResidentes', name: 'Voto de residentes extranjeros', path: 'votoResidentes', organic: true, options: [false, true],
    label: v => v ? 'Votan tras 3 años de residencia' : 'Solo votan los nacionales', pos: v => ({ ext: v ? -1.2 : 0.8 }), desc: 'Los inmigrantes residentes pasan a votar.' },
  { id: 'votoObligatorio', name: 'Voto obligatorio', path: 'votoObligatorio', organic: true, options: [false, true],
    label: v => v ? 'Obligatorio' : 'Voluntario', pos: () => ({}), desc: 'Reduce la abstención: vota también quien antes se quedaba en casa.' },
  { id: 'legislatura', name: 'Duración de la legislatura', path: 'legislatura', organic: true, options: [2, 3, 4, 5],
    label: v => v + ' años', pos: () => ({}), desc: 'Cada cuánto hay elecciones generales y cantonales.' },
  { id: 'limiteMandatos', name: 'Limitación de mandatos', path: 'limiteMandatos', organic: true, options: [false, true],
    label: v => v ? 'Máximo dos investiduras seguidas' : 'Sin límite', pos: v => ({ aut: v ? -0.7 : 0.4 }), desc: 'Un mismo partido no puede ser investido más de dos veces seguidas.' },
  // --- Trabajo y pensiones ---
  { id: 'salarioMin', name: 'Salario mínimo', path: 'salarioMin', options: [0, 0.35, 0.45, 0.55, 0.65],
    label: v => v === 0 ? 'Sin salario mínimo' : pctLbl(v) + ' del salario medio', pos: v => ({ eco: v === 0 ? 2 : 1.6 - (v - 0.35) / 0.30 * 3.4 }),
    desc: 'Eleva las rentas bajas; si es muy alto destruye empleo poco productivo.' },
  { id: 'laboral', noun: 'la legislación laboral', name: 'Contratación y despido', path: 'laboral', options: [0, 1, 2, 3, 4],
    label: v => ['Muy protectora', 'Protectora', 'Equilibrada', 'Flexible', 'Muy flexible'][v], pos: v => ({ eco: -2 + v }),
    desc: 'La flexibilidad crea empleo pero aumenta la precariedad.' },
  { id: 'desempleo', name: 'Prestación por desempleo', path: 'desempleo', options: [0, 1, 2, 3, 4],
    label: v => ['Mínima', 'Baja', 'Media', 'Alta', 'Muy alta'][v], pos: v => ({ eco: 2 - v }), desc: 'Protege a quien pierde el empleo.' },
  { id: 'pensiones', name: 'Cuantía de las pensiones', path: 'pensiones', options: [0.45, 0.55, 0.65, 0.75, 0.85],
    label: v => pctLbl(v) + ' del último salario', pos: v => ({ eco: 1.5 - (v - 0.45) / 0.40 * 3 }), desc: 'Muy popular entre jubilados y muy cara.' },
  { id: 'jubilacion', name: 'Edad de jubilación', path: 'jubilacion', options: [62, 65, 67, 70],
    label: v => v + ' años', pos: v => ({ eco: (v - 65) * 0.4 }), desc: 'Retrasarla ahorra en pensiones.' },
  { id: 'rentaBasica', name: 'Renta básica universal', path: 'rentaBasica', options: [false, true],
    label: v => v ? 'Aprobada' : 'No existe', pos: v => ({ eco: v ? -2 : 0.6 }), desc: 'Elimina la pobreza extrema, pero es carísima.' },
  { id: 'empresasPublicas', name: 'Empresas públicas', path: 'empresasPublicas', options: [0, 1, 2, 3, 4],
    label: v => ['Privatización total', 'Pocas', 'Modelo mixto', 'Muchas', 'Economía estatalizada'][v], pos: v => ({ eco: 2 - v }),
    desc: 'Cuánto empleo pueden tener las empresas públicas: nada (no se pueden crear ni nacionalizar), hasta el 5 %, el 15 %, el 35 % o sin límite. Muchas empresas públicas asustan al capital.' },
  // --- Vivienda ---
  { id: 'hipotecas', name: 'Concesión de hipotecas', path: 'hipotecas', options: [0, 1, 2, 3],
    label: v => ['Muy estricta (70 % del precio, cuota hasta el 30 % de los ingresos, 20 años)', 'Prudente (80 %, 35 %, 25 años)', 'Flexible (90 %, 40 %, 30 años)', 'Muy laxa (100 %, 50 %, 35 años)'][v],
    pos: v => ({ eco: -1.2 + v * 0.8 }), desc: 'Cuánto pueden prestar los bancos para comprar una vivienda. Más laxa: más gente compra y suben los precios, pero hay más impagos.' },
  { id: 'suelo', name: 'Ley del suelo', path: 'suelo', options: [0, 1, 2],
    label: v => ['Restrictiva', 'Equilibrada', 'Liberal'][v], pos: v => ({ eco: [-0.8, 0, 1][v], amb: [-1, 0, 1.2][v] }),
    desc: 'Cuánto se puede edificar en cada terreno. Liberal: más parcelas, bloques más altos y nuevas urbanizaciones junto a pueblos y ciudades; restrictiva: menos obra y viviendas más caras.' },
  { id: 'ayudaCompra', name: 'Ayudas a la compra de vivienda', path: 'ayudaCompra', options: [0, 1, 2],
    label: v => ['Sin ayudas', 'Aval público para menores de 36 años', 'Cheque vivienda (el Estado paga el 10 %)'][v], pos: v => ({ eco: [0.8, -0.3, -1][v] }),
    desc: 'El aval permite a los jóvenes pedir un 15 % más de hipoteca; el cheque paga una parte del precio (cuesta dinero público y empuja los precios).' },
  { id: 'desahucios', name: 'Desahucios por impago', path: 'desahucios', options: [0, 1, 2],
    label: v => ['Rápidos (al año de impago)', 'Con garantías (a los dos años)', 'Moratoria para familias vulnerables'][v], pos: v => ({ eco: [1.2, 0, -1.2][v], soc: [0.3, 0, -0.3][v] }),
    desc: 'Cuándo puede el banco quedarse con la vivienda de quien no paga la hipoteca. Proteger más encarece las hipotecas y hace que los bancos pierdan más.' },
  // --- Banca ---
  { id: 'solvencia', name: 'Requisitos de capital de los bancos', path: 'solvencia', options: [0, 1, 2],
    label: v => ['Bajos (5 % de lo prestado)', 'Medios (8 %)', 'Altos (12 %)'][v], pos: v => ({ eco: [1, 0, -0.8][v] }),
    desc: 'Cuánto dinero propio necesita un banco para prestar. Más alto: bancos más seguros, pero dan menos préstamos.' },
  { id: 'garantiaDepositos', name: 'Garantía de depósitos', path: 'garantiaDepositos', options: [0, 1, 2],
    label: v => ['Sin garantía', 'Hasta 100.000 € por persona', 'Total'][v], pos: v => ({ eco: [1, 0, -0.8][v] }),
    desc: 'Si un banco quiebra, el Estado devuelve los ahorros garantizados (a cargo del presupuesto). Sin garantía, los ahorradores pierden parte de su dinero.' },
  { id: 'bancoCentral', name: 'Banco central', path: 'bancoCentral', options: ['independiente', 'gobierno'],
    label: v => v === 'independiente' ? 'Independiente: fija el tipo de interés para controlar la inflación' : 'Sometido al Gobierno: tipos bajos', pos: v => ({ aut: v === 'gobierno' ? 1 : -0.4, eco: v === 'gobierno' ? -0.4 : 0.3 }),
    desc: 'El tipo oficial marca lo que cuestan las hipotecas y los préstamos. Un banco central sometido mantiene tipos bajos, pero la inflación sube.' },
  // --- Comercio ---
  { id: 'aranceles', name: 'Aranceles generales', path: 'aranceles', range: [0, 0.40], options: [0, 0.05, 0.10, 0.20, 0.30],
    label: pctLbl, pos: v => ({ ext: -2 + v / 0.30 * 4 }), desc: 'Protegen la producción nacional, suben precios y provocan represalias.' },
  // --- Energía y medio ambiente ---
  { id: 'energia', noun: 'la política energética', name: 'Modelo energético', path: 'energia', options: ['fosil', 'mixto', 'renovable', 'nuclear'],
    label: v => ({ fosil: 'Combustibles fósiles', mixto: 'Mixto', renovable: 'Renovable', nuclear: 'Nuclear' })[v],
    pos: v => ({ amb: { fosil: 2, mixto: 0.3, renovable: -1.8, nuclear: 0.4 }[v], ext: v === 'nuclear' ? 0.4 : 0 }),
    desc: 'Coste de la energía, emisiones y dependencia del exterior.' },
  { id: 'carbono', name: 'Impuesto al carbono', path: 'carbono', options: [0, 1, 2],
    label: v => ['Sin impuesto', 'Moderado', 'Elevado'][v], pos: v => ({ amb: 1.5 - v * 1.6, eco: -v * 0.3 }), desc: 'Reduce emisiones y recauda, pero encarece la energía.' },
  { id: 'proteccionNatural', name: 'Protección de espacios naturales', path: 'proteccionNatural', options: [0, 1, 2],
    label: v => ['Laxa', 'Media', 'Estricta'][v], pos: v => ({ amb: [1.5, 0, -1.5][v] }), desc: 'Limita la tala y la pesca para que los recursos no se agoten.' },
  // --- Derechos civiles ---
  { id: 'matrimonio', name: 'Matrimonio igualitario', path: 'matrimonio', options: [false, true],
    label: v => v ? 'Legal' : 'No reconocido', pos: v => ({ soc: v ? -1 : 1.5 }), desc: '' },
  { id: 'aborto', name: 'Aborto', path: 'aborto', options: [0, 1, 2],
    label: v => ['Prohibido', 'Por supuestos', 'Ley de plazos'][v], pos: v => ({ soc: [2, 0.5, -1][v] }),
    desc: 'Cuanto más fácil es abortar, menos nacimientos: la natalidad sube un 6 % si se prohíbe y baja un 6 % con una ley de plazos (frente a los supuestos).' },
  { id: 'eutanasia', name: 'Eutanasia', path: 'eutanasia', options: [0, 1, 2],
    label: v => ['Prohibida', 'Solo enfermos terminales', 'Amplia (también sufrimiento insoportable)'][v], pos: v => ({ soc: [1.5, -0.3, -1.5][v] }),
    desc: 'Cuanto más libre es la eutanasia, algo más de mortalidad entre las personas mayores y enfermas (hasta un 10 % más a partir de los 75 años con la ley amplia).' },
  { id: 'cannabis', name: 'Cannabis', path: 'cannabis', options: [false, true],
    label: v => v ? 'Legal y regulado' : 'Prohibido', pos: v => ({ soc: v ? -1.5 : 1, eco: v ? 0.3 : 0, aut: v ? -0.6 : 0.4 }), desc: 'Legalizarlo aporta impuestos.' },
  // --- Educación ---
  { id: 'religionEscuela', name: 'Religión en la escuela', path: 'religionEscuela', options: [false, true],
    label: v => v ? 'Asignatura evaluable' : 'Escuela laica', pos: v => ({ soc: v ? 1.5 : -1.2 }), desc: '' },
  { id: 'ayudaInversion', name: 'Ayudas a la inversión empresarial', path: 'ayudaInversion', options: [0, 0.15, 0.3],
    label: v => v ? `El Estado paga el ${Math.round(v * 100)} % de la obra` : 'Sin ayudas', pos: v => ({ eco: [0.3, -0.3, -0.7][[0, 0.15, 0.3].indexOf(v)] }),
    desc: 'Parte de la obra que paga el Estado cuando alguien funda una empresa o la amplía un nivel. No obliga a nadie: hace que a más empresarios les salgan las cuentas para invertir.' },
  // --- Seguridad y justicia ---
  { id: 'penal', name: 'Código penal', path: 'penal', options: [0, 1, 2],
    label: v => ['Garantista', 'Equilibrado', 'Punitivo'][v], pos: v => ({ aut: [-1.5, 0, 1.5][v], soc: [-0.5, 0, 0.5][v] }), desc: 'Endurecer las penas mejora algo la seguridad.' },
  { id: 'armasCiviles', name: 'Tenencia de armas', path: 'armasCiviles', options: [0, 1, 2],
    label: v => ['Prohibida', 'Con licencia estricta', 'Libre'][v], pos: v => ({ aut: [0.3, 0, -0.5][v], soc: [-0.8, 0, 1.2][v], ext: [0, 0, 0.3][v] }),
    desc: 'Si se permite, los hogares compran armas (más demanda para la industria de armamento) y sube algo la delincuencia violenta.' },
  { id: 'servicioMilitar', name: 'Servicio militar', path: 'servicioMilitar', options: [false, true],
    label: v => v ? 'Obligatorio' : 'Ejército profesional', pos: v => ({ ter: v ? -1.2 : 0.3, soc: v ? 0.6 : -0.3, aut: v ? 1 : -0.3 }), desc: 'Reduce el paro juvenil a costa de la productividad.' },
  // --- Extranjería ---
  { id: 'inmigracion', name: 'Política migratoria', path: 'inmigracion', options: [0, 1, 2, 3, 4],
    label: v => ['Fronteras abiertas', 'Acogedora', 'Regulada', 'Restrictiva', 'Cerrada'][v], pos: v => ({ ext: -2 + v, soc: (v - 2) * 0.5 }),
    desc: 'Cuánta gente de otros países puede venir a vivir aquí cada trimestre (si encuentra vivienda). Más inmigración amplía la población activa; si llegan muchos de culturas muy distintas y no se integran, puede subir la delincuencia.' },
  { id: 'naturalizacion', name: 'Años para obtener la nacionalidad', path: 'naturalizacion', options: [3, 5, 10, 15],
    label: v => v + ' años', pos: v => ({ ext: (v - 7) * 0.2 }), desc: 'Los nacionalizados pueden votar.' },
  // --- Modelo territorial ---
  { id: 'solidaridad', name: 'Solidaridad entre cantones', path: 'solidaridad', options: [0, 1, 2],
    label: v => ['Baja', 'Media', 'Alta'][v], pos: v => ({ ter: [1.2, 0, -1][v], eco: [0.6, 0, -0.6][v] }), desc: 'Cuánto dinero pasa de los cantones ricos a los pobres.' },
  { id: 'lenguas', name: 'Lenguas cantonales', path: 'lenguas', options: [false, true],
    label: v => v ? 'Cooficiales' : 'Lengua única', pos: v => ({ ter: v ? 1.5 : -1.5 }), desc: 'Muy valorado en los cantones con cultura propia, donde alimenta el fervor cantonalista.' },
  { id: 'derechoDecidir', name: 'Consultas de autodeterminación', path: 'derechoDecidir', organic: true, options: ['prohibida', 'pactada'],
    label: v => v === 'pactada' ? 'Consultas pactadas con el Estado' : 'Prohibidas', pos: v => ({ ter: v === 'pactada' ? 1.8 : -1, aut: v === 'pactada' ? -0.5 : 0.3 }),
    desc: 'Permitir que un cantón consulte a su gente sobre su futuro dispara el fervor cantonalista donde ya es alto, y el centralista en el resto del país.' },
  { id: 'concierto', name: 'Concierto económico', path: 'concierto', cantonSet: true, options: [[]],
    label: v => cantonSetLabel(v), pos: v => ({ ter: v && v.length ? 1.3 : -0.4, eco: v && v.length ? 0.3 : 0 }),
    desc: 'Los cantones con concierto se quedan con lo que el Estado recauda en ellos y le pagan un cupo por los servicios comunes; a cambio, dejan de recibir transferencias. Su fervor cantonalista sube y, en el resto del país, el centralista.' },
  { id: 'cupo', name: 'Cálculo del cupo', path: 'cupo', options: [0, 1, 2],
    label: v => ['Favorable al cantón', 'Equilibrado', 'Exigente'][v], pos: v => ({ ter: [0.8, 0, -0.6][v] }),
    desc: 'Cómo se negocia el cupo que pagan los cantones con concierto por los servicios comunes del Estado. Favorable: el cantón gana el equivalente al 10 % de lo que el Estado gasta en su población; equilibrado, un 4 %; exigente, pierde un 2 %.' },
  // --- Símbolos e identidad ---
  { id: 'simbolos', name: 'Símbolos oficiales', path: 'simbolos', options: ['nacional', 'ambas', 'libre'],
    label: v => ({ nacional: 'Solo la bandera y el himno nacionales', ambas: 'Los nacionales y los de cada cantón', libre: 'Cada cantón decide los suyos' })[v],
    pos: v => ({ ter: { nacional: -1.6, ambas: 0, libre: 1.2 }[v], soc: { nacional: 0.4, ambas: 0, libre: -0.2 }[v] }),
    desc: 'Imponer los símbolos nacionales sube el fervor centralista (y, por reacción, el cantonalista donde ya es fuerte). Dejarlos a cada cantón alimenta el cantonalista.' },
  { id: 'selecciones', name: 'Selecciones deportivas cantonales', path: 'selecciones', options: [false, true],
    label: v => v ? 'Pueden competir fuera' : 'Solo la selección nacional', pos: v => ({ ter: v ? 1 : -0.6 }),
    desc: 'Que los cantones con cultura propia compitan con su selección refuerza su fervor cantonalista.' },
  { id: 'curriculo', name: 'Contenidos del currículo escolar', path: 'curriculo', options: ['comun', 'mixto', 'cantonal'],
    label: v => ({ comun: 'Común para todo el país', mixto: 'Común con contenidos cantonales', cantonal: 'Lo decide cada cantón' })[v],
    pos: v => ({ ter: { comun: -1.2, mixto: 0, cantonal: 1.2 }[v] }),
    desc: 'Qué historia, lengua y cultura se enseña. Un currículo cantonal alimenta el fervor cantonalista; uno común lo frena y sube el centralista.' },
  // --- Buen gobierno ---
  { id: 'transparencia', name: 'Portal de transparencia', path: 'transparencia', options: [false, true],
    label: v => v ? 'En vigor' : 'No existe', pos: v => ({ aut: v ? -0.8 : 0.5 }), desc: 'Más probabilidad de que la corrupción salga a la luz.' },
  { id: 'fiscalia', name: 'Fiscalía anticorrupción', path: 'fiscalia', options: [false, true],
    label: v => v ? 'Creada' : 'No existe', pos: v => ({ aut: v ? -0.4 : 0.3 }), desc: 'Persigue activamente la corrupción.' },
  { id: 'judicial', name: 'Independencia judicial', path: 'judicial', organic: true, options: [0, 1, 2],
    label: v => ['Jueces elegidos por el Gobierno', 'Sistema mixto', 'Plena independencia'][v], pos: v => ({ aut: [1.6, 0, -1.2][v] }),
    desc: 'Con jueces controlados la corrupción del Gobierno rara vez se descubre, pero cae la confianza.' },
  { id: 'tvPublica', name: 'Televisión pública', path: 'tvPublica', options: ['independiente', 'gubernamental'],
    label: v => v === 'independiente' ? 'Independiente' : 'Controlada por el Gobierno', pos: v => ({ aut: v === 'gubernamental' ? 1.4 : -0.5 }),
    desc: 'Da popularidad al Gobierno a costa de la confianza institucional.' },
  { id: 'financiacion', name: 'Financiación de partidos', path: 'financiacion', organic: true, options: ['publica', 'mixta', 'privada'],
    label: v => ({ publica: 'Solo pública', mixta: 'Mixta (donaciones limitadas)', privada: 'Privada (donaciones sin límite)' })[v],
    pos: v => ({ eco: { publica: -0.8, mixta: 0, privada: 1 }[v] }), desc: 'De dónde sacan los partidos su dinero.' },
];
const FIELDS = {}; FIELD_LIST.forEach(f => FIELDS[f.id] = f);


// ============================================================
//  COMPETENCIAS, IMPUESTOS Y PARTIDAS DE GASTO
//  Cada materia puede ser del Estado, compartida o de los cantones.
//  El Estado y cada cantón tienen sus propios impuestos y partidas.
// ============================================================
const AREAS = [
  { id: 'sanidad', name: 'Sanidad', icon: 'stethoscope', base: 6, max: 12, pos: v => ({ eco: (6 - v) * 0.5 }), desc: 'Hospitales y centros de salud: calidad sanitaria y empleo sanitario.' },
  { id: 'educacion', name: 'Educación', icon: 'graduation-cap', base: 4.5, max: 10, pos: v => ({ eco: (4.5 - v) * 0.5, soc: (4.5 - v) * 0.15 }), desc: 'Escuelas y universidades públicas: calidad educativa y productividad futura.' },
  { id: 'transporte', name: 'Transporte', icon: 'train-front', base: 2.5, max: 8, pos: v => ({ amb: (v - 2.5) * 0.3, eco: (2.5 - v) * 0.25 }), desc: 'Carreteras, trenes y transporte público: empleo en la construcción ahora y productividad después.' },
  { id: 'seguridad', name: 'Seguridad ciudadana', icon: 'siren', base: 1.4, max: 5, pos: v => ({ aut: (v - 1.4) * 1.1, soc: (v - 1.4) * 0.4, ter: (1.4 - v) * 0.2 }), desc: 'Policía: menos delincuencia.' },
  { id: 'social', name: 'Asuntos sociales', icon: 'heart', base: 1.5, max: 8, pos: v => ({ eco: (1.5 - v) * 0.8 }), desc: 'Servicios sociales, dependencia y vivienda social: menos pobreza y más bienestar de las rentas bajas.' },
];
const AREA_IDS = AREAS.map(a => a.id);
const COMP_LABEL = { nacional: 'Del Estado', compartida: 'Compartida', cantonal: 'De los cantones' };
const NAT_SHARE = { nacional: 1, compartida: 0.5, cantonal: 0 };
const natApplies = (pol, area) => pol.comp[area] !== 'cantonal';
const cantApplies = (pol, area) => pol.comp[area] !== 'nacional';

const TAXES = [
  { id: 'irpf', name: 'IRPF', long: 'IRPF progresivo (tipo medio)', icon: 'wallet', range: [0, 0.45], ref: 0.14, w: 1, newNat: 0.12, newCant: 0.02,
    desc: 'Impuesto sobre la renta. El tipo es la media: quien gana más paga un porcentaje mayor y quien gana menos, uno menor. Se cobra antes de que la gente gaste; muy alto deja menos para consumir y ahorrar.' },
  { id: 'irpfPlano', name: 'IRPF plano', long: 'IRPF de tipo único (plano)', icon: 'percent', range: [0, 0.35], ref: 0.12, w: 0.6, newNat: 0.10, newCant: 0.02,
    pos: v => ({ eco: v == null ? 0 : clamp(0.9 - v / 0.12 * 0.5, -1.5, 1.5) }),
    desc: 'El mismo porcentaje para todas las rentas: con un 10 %, el 10 % de cada sueldo va a Hacienda. Sencillo, pero pesa más sobre las rentas bajas.' },
  { id: 'nominas', name: 'Impuesto sobre las nóminas', long: 'Impuesto sobre las nóminas (cotizaciones)', icon: 'hard-hat', range: [0, 0.40], ref: 0.20, w: 0.8, newNat: 0.05, newCant: 0.01,
    desc: 'Lo pagan las empresas por cada sueldo. Financia mucho, pero encarece contratar y frena el empleo.' },
  { id: 'sociedades', name: 'Impuesto de sociedades', long: 'Impuesto de sociedades', icon: 'factory', range: [0, 0.45], ref: 0.22, w: 1, newNat: 0.15, newCant: 0.02,
    desc: 'Sobre los beneficios de las empresas. Muy alto ahuyenta la inversión extranjera y puede provocar fuga de capitales.' },
  { id: 'sucesiones', name: 'Impuesto de sucesiones', long: 'Impuesto de sucesiones', icon: 'scroll-text', range: [0, 0.50], ref: 0.12, w: 0.7, newNat: 0.10, newCant: 0.05,
    desc: 'Grava las herencias. Recauda poco y genera mucha polémica entre jubilados y rentas altas.' },
  { id: 'iva', name: 'IVA', long: 'IVA (impuesto sobre el consumo)', icon: 'receipt', range: [0, 0.30], ref: 0.16, w: 0.9, newNat: 0.10, newCant: 0.02,
    desc: 'Se suma al precio de lo que compran los hogares: recauda exactamente ese porcentaje de lo que gastan en su cesta. Encarece la vida y deja menos para otras cosas.' },
  { id: 'ibi', name: 'IBI', long: 'Impuesto de bienes inmuebles (IBI)', icon: 'house', range: [0, 0.015], ref: 0.005, w: 0.5, newNat: 0.003, newCant: 0.004,
    desc: 'Cada año, un porcentaje del valor de viviendas y locales. Recaudación estable; molesta a propietarios y jubilados.' },
  { id: 'vacias', name: 'Impuesto sobre viviendas vacías', long: 'Impuesto sobre viviendas vacías', icon: 'door-open', range: [0, 0.05], ref: 0.01, w: 0.5, newNat: 0.01, newCant: 0.01,
    desc: 'Penaliza tener pisos vacíos: saca viviendas al mercado, abarata el alquiler y recauda poco.' },
];
const TAX_IDS = TAXES.map(t => t.id);
const num2 = v => (Math.round(v * 100) / 100).toLocaleString('es-ES', { maximumFractionDigits: 2 });
const sample5 = (ref, lo, hi) => [0.5, 0.75, 1, 1.25, 1.5].map(m => clamp(Math.round(ref * m * 10000) / 10000, lo, hi));
function taxField(t, canton) {
  return {
    id: (canton ? 'ct_' : '') + t.id, tax: t.id, name: t.long, short: t.name, path: t.id, icon: t.icon, optional: true, unit: 'frac',
    range: t.range, newValue: canton ? t.newCant : t.newNat, options: sample5(t.ref * (canton ? 0.3 : 1), t.range[0], t.range[1]),
    label: v => v == null ? 'No existe' : pctLbl(v), desc: t.desc,
    pos: t.pos || (v => ({ eco: clamp((t.ref - (v || 0)) / t.ref * 1.4, -2, 2) * t.w * (canton ? 0.7 : 1) })),
  };
}
// Partidas de gasto: % del PIB del Estado, o % del PIB del cantón en las cantonales
const NAT_SPEND = AREAS.map(a => Object.assign({ area: true }, a)).concat([
  { id: 'defensa', name: 'Defensa', icon: 'shield-half', base: 1.5, max: 6, pos: v => ({ ter: (1.5 - v) * 0.6, ext: (v - 1.5) * 0.4, soc: (v - 1.5) * 0.3 }), desc: 'Gasto militar.' },
  { id: 'cultura', name: 'Cultura', icon: 'book-open', base: 0.6, max: 3, pos: v => ({ soc: (0.6 - v) * 1.5 }), desc: 'Muy valorado por artistas y estudiantes.' },
  { id: 'transferencias', name: 'Transferencias a los cantones', icon: 'map', base: 6, max: 25, pos: v => ({ ter: (v - 6) * 0.25 }), desc: 'Dinero que el Estado reparte a los cantones para pagar sus servicios (más a los pobres cuanto mayor sea la solidaridad).' },
]);
const CANT_SPEND = AREAS.map(a => Object.assign({ area: true }, a)).concat([
  { id: 'campo', name: 'Ayudas al campo', icon: 'tractor', base: 0.4, max: 2, pos: v => ({ ext: (v - 0.4) * 0.6, eco: (0.4 - v) * 0.5 }), desc: 'Subvenciones a las explotaciones agrícolas, ganaderas y pesqueras del cantón (no a las forestales).' },
]);
function spendField(sp, canton) {
  return {
    id: (canton ? 'ct_g_' : 'g_') + sp.id, item: sp.id, name: sp.name, path: 'gasto.' + sp.id, icon: sp.icon, unit: 'pct', range: [0, sp.max],
    competence: !canton && sp.area ? sp.id : undefined, requiresComp: canton && sp.area ? sp.id : undefined,
    options: sample5(sp.base, 0, sp.max), label: v => num2(v) + (canton ? ' % del PIB cantonal' : ' % del PIB'), pos: v => sp.pos(v || 0), desc: sp.desc,
  };
}
// Leyes sueltas: no existen hasta que alguien las propone
const STANDALONE = [
  { id: 'sindicatos', name: 'Subvenciones a los sindicatos', icon: 'handshake', path: 'sub.sindicatos', range: [0, 0.2], newValue: 0.03,
    pos: v => ({ eco: clamp(1 - (v || 0) * 15, -2, 2) }), desc: 'Dinero público para las organizaciones sindicales: menos huelgas y conflictividad, y simpatía de los trabajadores.' },
  { id: 'ciencia', name: 'Financiación de la ciencia', icon: 'atom', path: 'sub.ciencia', range: [0, 2.5], newValue: 0.5,
    pos: v => ({ ext: (0.6 - (v || 0)) * 0.4, eco: (0.6 - (v || 0)) * 0.3 }), desc: 'Becas, laboratorios e investigación: sector tecnológico y productividad a largo plazo.' },
  { id: 'renovables', name: 'Subvención a energías renovables', icon: 'sun', path: 'sub.renovables', range: [0, 1.5], newValue: 0.2,
    pos: v => ({ amb: (0.3 - (v || 0)) * 2 }), desc: 'Ayudas para instalar renovables: menos emisiones y menos dependencia energética.' },
];
const standaloneField = sa => ({ id: sa.id, name: sa.name, path: sa.path, icon: sa.icon, optional: true, unit: 'pct', range: sa.range, newValue: sa.newValue,
  options: sample5(sa.newValue * 2, sa.range[0], sa.range[1]), label: v => v == null ? 'No existe' : num2(v) + ' % del PIB', pos: sa.pos, desc: sa.desc });
const compField = a => ({ id: 'c_' + a.id, name: 'Competencia de ' + a.name.toLowerCase(), path: 'comp.' + a.id, options: ['nacional', 'compartida', 'cantonal'],
  label: v => COMP_LABEL[v], pos: v => ({ ter: { nacional: -1, compartida: 0.3, cantonal: 1.2 }[v] }),
  desc: 'Quién paga y gestiona ' + a.name.toLowerCase() + '. Si es compartida, el Estado y cada cantón tienen su propia partida.' });

TAXES.forEach(t => { const f = taxField(t, false); FIELD_LIST.push(f); FIELDS[f.id] = f; });
NAT_SPEND.forEach(sp => { const f = spendField(sp, false); FIELD_LIST.push(f); FIELDS[f.id] = f; });
STANDALONE.forEach(sa => { const f = standaloneField(sa); FIELD_LIST.push(f); FIELDS[f.id] = f; });
AREAS.forEach(a => { const f = compField(a); FIELD_LIST.push(f); FIELDS[f.id] = f; });
// Aranceles por producto: excepciones al arancel general (importación) y aranceles a la exportación
const TARIFF_OPTS = [0, 0.05, 0.10, 0.20, 0.30, 0.50];
const GOOD_PRODUCERS = { grano: ['agricultor'], tejido: ['agricultor'], carne: ['agricultor'], pescado: ['pescador'], madera: ['operario'], muebles: ['operario'], ropa: ['operario'],
  piedra: ['operario'], metal: ['operario'], carbon: ['operario'], maquinas: ['operario', 'ingeniero'], armas: ['operario', 'ingeniero'], electricidad: ['ingeniero'], telecom: ['ingeniero'], entretenimiento: ['periodista'], gimnasio: ['comerciante'], alimentos: ['operario'], servicios: ['comerciante'] };
function tariffField(g, exp) {
  const nm = GOODS[g].name.toLowerCase();
  return { id: (exp ? 'are_' : 'ari_') + g, name: (exp ? 'Arancel a la exportación de ' : 'Arancel a la importación de ') + nm, short: (exp ? 'Exportar ' : 'Importar ') + nm,
    path: (exp ? 'arExp.' : 'arImp.') + g, optional: true, tariff: true, good: g, exp, icon: GOODS[g].icon, options: TARIFF_OPTS, newValue: exp ? 0.05 : 0.15,
    label: v => v == null ? (exp ? 'Sin arancel' : 'El arancel general') : pctLbl(v),
    pos: v => v == null ? {} : exp ? { eco: -Math.min(2, v * 6), ext: Math.min(1.5, v * 3) } : { ext: clamp(-1.5 + v / 0.3 * 3, -2, 2) * 0.7 },
    desc: exp ? `Lo pagan quienes venden ${nm} fuera: recauda, pero abarata ${nm} aquí y perjudica a quien lo produce.` : `Sustituye al arancel general para ${nm}: protege a quien lo produce aquí y encarece lo importado.` };
}
const TARIFF_FIELD_IDS = [];
GOOD_IDS.filter(g => !GOODS[g].local).forEach(g => [false, true].forEach(exp => { const f = tariffField(g, exp); FIELD_LIST.push(f); FIELDS[f.id] = f; TARIFF_FIELD_IDS.push(f.id); }));

const LAW_PACKS = [
  { id: 'electoral', noun: 'la Ley Electoral', name: 'Ley Electoral', icon: 'vote', organic: true, fields: ['sistemaElectoral', 'umbral', 'edadVoto', 'votoResidentes', 'votoObligatorio', 'legislatura', 'limiteMandatos'],
    desc: 'Todas las reglas de las elecciones. Es ley orgánica: necesita mayoría absoluta.' },
  { id: 'fiscal', noun: 'el régimen fiscal', name: 'Régimen fiscal', icon: 'coins', addable: true, fields: TAX_IDS,
    desc: 'Los impuestos del Estado. Puedes cambiar los tipos, suprimir impuestos o crear uno nuevo que hoy no existe.' },
  { id: 'presupuestos', noun: 'los Presupuestos', name: 'Presupuestos Generales', icon: 'landmark', govOnly: true, fields: NAT_SPEND.map(sp => 'g_' + sp.id),
    desc: 'Cuánto gasta el Estado en cada partida. Solo puede presentarlos el Gobierno (presidencia o Hacienda).' },
  { id: 'laboral', name: 'Reforma Laboral y de Pensiones', icon: 'hard-hat', noun: 'la legislación laboral y de pensiones', fields: ['salarioMin', 'laboral', 'desempleo', 'pensiones', 'jubilacion', 'rentaBasica'], desc: '' },
  { id: 'vivienda', noun: 'la ley de vivienda', name: 'Ley de Vivienda', icon: 'house', fields: ['hipotecas', 'suelo', 'ayudaCompra', 'desahucios'],
    desc: 'Hipotecas, cuánto se puede construir, ayudas para comprar y desahucios.' },
  { id: 'banca', noun: 'la ley de banca', name: 'Ley de Banca', icon: 'landmark', fields: ['solvencia', 'garantiaDepositos', 'bancoCentral'],
    desc: 'Solvencia de los bancos, garantía de los ahorros y banco central.' },
  { id: 'sectorPublico', noun: 'el sector público', name: 'Ley del Sector Público', icon: 'factory', fields: ['empresasPublicas', 'ayudaInversion'], desc: '' },
  { id: 'comercio', noun: 'la política comercial', name: 'Ley de Comercio Exterior', icon: 'ship', fields: ['aranceles'].concat(TARIFF_FIELD_IDS), addable: true, addLabel: 'Añadir un arancel para un producto concreto:', dynamicTreaties: true, desc: 'Aranceles y tratados de libre comercio.' },
  { id: 'energia', name: 'Ley de Energía y Medio Ambiente', icon: 'zap', noun: 'la ley de energía', fields: ['energia', 'proteccionNatural', 'carbono'], desc: '' },
  { id: 'derechos', noun: 'los derechos civiles', name: 'Ley de Derechos Civiles', icon: 'scale', fields: ['matrimonio', 'aborto', 'eutanasia', 'cannabis'], desc: '' },
  { id: 'educacion', name: 'Ley de Educación', icon: 'school', noun: 'la ley de educación', fields: ['religionEscuela', 'curriculo'], desc: '' },
  { id: 'identidad', name: 'Ley de Símbolos y Deporte', icon: 'flag', noun: 'la ley de símbolos', fields: ['simbolos', 'selecciones'],
    desc: 'Banderas, himnos y selecciones deportivas: poco dinero y mucho sentimiento. Mueve el fervor cantonalista y el centralista.' },
  { id: 'seguridad', name: 'Ley de Seguridad y Defensa', icon: 'shield-check', noun: 'la ley de seguridad y defensa', fields: ['penal', 'armasCiviles', 'servicioMilitar'], desc: '' },
  { id: 'extranjeria', noun: 'la ley de extranjería', name: 'Ley de Extranjería', icon: 'plane', fields: ['inmigracion', 'naturalizacion'], desc: '' },
  { id: 'territorial', noun: 'el Estatuto Territorial', name: 'Estatuto Territorial', icon: 'map', organic: true, fields: AREAS.map(a => 'c_' + a.id).concat(['lenguas', 'derechoDecidir']),
    desc: 'Reparto de competencias entre el Estado y los cantones. Al transferir una materia, su dinero pasa a las transferencias a los cantones. Ley orgánica.' },
  { id: 'finTerritorial', noun: 'la financiación cantonal', name: 'Ley de Financiación Cantonal', icon: 'handshake', fields: ['solidaridad', 'concierto', 'cupo'],
    desc: 'Cómo se reparte el dinero entre el Estado y los cantones: la solidaridad entre ricos y pobres y los conciertos económicos, que dejan a un cantón recaudar los impuestos del Estado a cambio de un cupo.' },
  { id: 'gobierno', noun: 'las normas de buen gobierno', name: 'Ley de Transparencia y Buen Gobierno', icon: 'eye', fields: ['transparencia', 'fiscalia', 'judicial', 'tvPublica', 'financiacion'], desc: '' },
].concat(STANDALONE.map(sa => ({ id: sa.id, noun: 'la ley de ' + sa.name.toLowerCase(), name: sa.name, icon: sa.icon, fields: [sa.id], standalone: true, desc: sa.desc })));

// Leyes cantonales: cada cantón tiene sus impuestos y sus partidas, como el Estado
const CANTON_FIELD_LIST = [
  { id: 'ct_lengua', name: 'Inmersión lingüística', path: 'lengua', options: [false, true], label: v => v ? 'En vigor' : 'No', pos: v => ({ ter: v ? 1.6 : -0.8 }),
    desc: 'Escuela en lengua propia: el impulso más fuerte al fervor cantonalista, y hace que los que llegan de fuera se sientan antes del cantón.' },
  { id: 'ct_rotulacion', name: 'Lengua de la Administración', path: 'rotulacion', options: [0, 1, 2], label: v => ['Solo la lengua común', 'Bilingüe', 'Solo la lengua propia'][v],
    pos: v => ({ ter: [-0.8, 0.4, 1.6][v] }), desc: 'Carteles, impresos y atención al público. Solo la lengua propia sube el fervor cantonalista, pero también algo el centralista.' },
  { id: 'ct_tv', name: 'Televisión pública cantonal', path: 'tv', options: [false, true], label: v => v ? 'Existe' : 'No existe', pos: v => ({ ter: v ? 0.9 : -0.4, eco: v ? -0.2 : 0.2 }),
    desc: 'Cuesta un 0,08 % del PIB del cantón al año y alimenta el fervor cantonalista.' },
  { id: 'ct_fiestas', name: 'Promoción de la cultura propia', path: 'fiestas', options: [0, 1, 2], label: v => ['Ninguna', 'Moderada', 'Intensa'][v], pos: v => ({ ter: [-0.5, 0.3, 1.1][v], soc: [0, 0.2, 0.4][v] }),
    desc: 'Fiestas, día del cantón, música y tradiciones. Cuesta un 0,03 % o un 0,08 % del PIB del cantón y sube el fervor cantonalista.' },
  { id: 'ct_exterior', name: 'Delegaciones en el exterior', path: 'exterior', options: [false, true], label: v => v ? 'Abiertas' : 'No hay', pos: v => ({ ter: v ? 1 : -0.4, ext: v ? -0.4 : 0 }),
    desc: 'Oficinas del cantón en otros países. Cuestan un 0,03 % de su PIB y refuerzan el fervor cantonalista.' },
];
TAXES.forEach(t => CANTON_FIELD_LIST.push(taxField(t, true)));
CANT_SPEND.forEach(sp => CANTON_FIELD_LIST.push(spendField(sp, true)));
CANTON_FIELD_LIST.forEach(f => FIELDS[f.id] = f);
const CANTON_PACKS = [
  { id: 'ct_presupuesto', noun: 'el presupuesto cantonal', name: 'Presupuesto cantonal', icon: 'wallet', canton: true, fields: CANT_SPEND.map(sp => 'ct_g_' + sp.id),
    desc: 'Partidas del cantón. Las materias solo aparecen si el cantón tiene la competencia (propia o compartida).' },
  { id: 'ct_fiscal', noun: 'la fiscalidad cantonal', name: 'Hacienda cantonal', icon: 'percent', canton: true, addable: true, fields: TAXES.map(t => 'ct_' + t.id),
    desc: 'Impuestos propios del cantón, que se suman a los del Estado. Se pueden crear, cambiar o suprimir.' },
  { id: 'ct_cultura', noun: 'la ley de lengua', name: 'Ley de Lengua y Cultura', icon: 'book-open', canton: true, fields: ['ct_lengua', 'ct_rotulacion', 'ct_tv', 'ct_fiestas', 'ct_exterior'],
    desc: 'Lengua, medios y cultura propios del cantón. Son las herramientas que más mueven su fervor cantonalista (cuanto más alto está, más cuesta subirlo).' },
];

// Grupos especialmente afectados por cada campo (multiplican su reacción)
const LAW_INTEREST = {
  pensiones: { jubilado: 3 }, jubilacion: { jubilado: 1.5, operario: 1.5 }, salarioMin: { operario: 1.4, parado: 1.5, empresario: 1.8, agricultor: 1.2 },
  desempleo: { parado: 2.5 }, laboral: { operario: 1.6, empresario: 2, parado: 1.4 }, rentaBasica: { parado: 2, estudiante: 1.5, empresario: 1.5 },
  sociedades: { empresario: 2.5 }, irpf: { empresario: 1.5, sanitario: 1.2 }, irpfPlano: { empresario: 1.6, operario: 1.3, parado: 1.2 },
  nominas: { empresario: 2.2, operario: 1.2 }, sucesiones: { empresario: 1.6, jubilado: 1.6, agricultor: 1.4 },
  ibi: { jubilado: 1.5 }, vacias: { estudiante: 1.8, parado: 1.3 },
  hipotecas: { estudiante: 1.6, oficinista: 1.5 }, suelo: { operario: 1.3, empresario: 1.4, agricultor: 1.2 }, ayudaCompra: { estudiante: 2, parado: 1.2 },
  desahucios: { parado: 2, oficinista: 1.5, empresario: 1.3 }, solvencia: { oficinista: 2, empresario: 1.3 }, garantiaDepositos: { jubilado: 1.6, oficinista: 1.5 },
  bancoCentral: { oficinista: 1.5, jubilado: 1.2 }, armasCiviles: { policia: 2, agricultor: 1.4 },
  iva: { empresario: 1.6 }, aranceles: { agricultor: 2, operario: 1.6, pescador: 1.6 },
  g_sanidad: { sanitario: 3, jubilado: 1.5 }, g_educacion: { academico: 3, estudiante: 2 }, g_defensa: { policia: 1.5 }, g_social: { parado: 2, jubilado: 1.4 },
  g_seguridad: { policia: 3 }, g_cultura: { academico: 2 }, g_transporte: { operario: 1.5 }, ciencia: { academico: 2.5, estudiante: 1.5 },
  sindicatos: { operario: 2, empresario: 1.6 }, renovables: { operario: 1.2 },
  servicioMilitar: { estudiante: 2.5 }, energia: { operario: 1.5, empresario: 1.3 },
  proteccionNatural: { pescador: 2, operario: 1.4, agricultor: 1.3 }, carbono: { agricultor: 1.6, operario: 1.5, empresario: 1.3 }, cannabis: { estudiante: 1.5 },
  inmigracion: { extranjero: 2.5 }, votoResidentes: { extranjero: 3 }, naturalizacion: { extranjero: 2.5 }, edadVoto: { estudiante: 1.5 },
  ct_g_campo: { agricultor: 3, pescador: 3 }, ct_g_transporte: { operario: 1.5 },
  ct_g_sanidad: { sanitario: 3 }, ct_g_educacion: { academico: 3 }, ct_g_seguridad: { policia: 3 }, ct_g_social: { parado: 2 },
  curriculo: { academico: 1.6, estudiante: 1.3 }, selecciones: { estudiante: 1.2 }, ct_tv: { periodista: 2.2 }, ct_rotulacion: { comerciante: 1.6 }, ct_lengua: { academico: 1.6 },
  ct_irpf: { empresario: 1.3 }, ct_ibi: { jubilado: 1.5 }, ct_vacias: { estudiante: 1.6 }, ct_sucesiones: { jubilado: 1.5, empresario: 1.6 },
};
GOOD_IDS.forEach(g => { const m = {}; GOOD_PRODUCERS[g].forEach(pr => m[pr] = 2); LAW_INTEREST['ari_' + g] = m; LAW_INTEREST['are_' + g] = m; });
// Nombre del colectivo para los titulares
const GROUP_NAMES = {
  jubilado: 'los jubilados', operario: 'los trabajadores', parado: 'los parados', empresario: 'los empresarios', agricultor: 'el campo',
  pescador: 'los pescadores', oficinista: 'los oficinistas', comerciante: 'los comerciantes', ingeniero: 'los ingenieros', periodista: 'los periodistas', sanitario: 'los sanitarios', academico: 'los docentes', estudiante: 'los jóvenes', policia: 'la policía', extranjero: 'los inmigrantes',
};

// ============================================================
//  MINISTERIOS
// ============================================================
const MINISTRIES = [
  { id: 'interior', name: 'Interior', icon: 'shield-check', power: 'Acción: ordenar una investigación policial a otro partido, o "enfriar" las pruebas contra el tuyo (arriesgado). Abre y cierra las comisarías del Estado.' },
  { id: 'exteriores', name: 'Exteriores', icon: 'globe', power: 'Acción: negociar un tratado de libre comercio, que llega al Parlamento sin coste de PC.' },
  { id: 'transporte', name: 'Transporte', icon: 'train-front', power: 'Acción: plan de obras urgente (0,2 % del PIB): empleo inmediato en la construcción y mejores infraestructuras. No disponible si el transporte está transferido por completo.' },
  { id: 'economia', name: 'Economía', icon: 'trending-up', power: 'Acción: subir o bajar el salario mínimo por decreto, o lanzar un plan de atracción de inversiones (más inversión extranjera durante 2 trimestres).' },
  { id: 'hacienda', name: 'Hacienda', icon: 'coins', power: 'Presenta los Presupuestos (igual que la presidencia). Las leyes fiscales le cuestan 1 PC menos. Acción: mover hasta 0,5 puntos de PIB entre dos partidas del Estado.' },
  { id: 'sanidad', name: 'Sanidad', icon: 'stethoscope', power: 'Acción: plan de choque sanitario (mejora la calidad durante 2 trimestres). No disponible si la sanidad está transferida por completo.' },
  { id: 'educacion', name: 'Educación y Cultura', icon: 'graduation-cap', power: 'Acción: plan de choque educativo (mejora la calidad durante 2 trimestres). No disponible si la educación está transferida por completo.' },
  { id: 'social', name: 'Asuntos Sociales', icon: 'heart', power: 'Acción: plan de choque contra la pobreza (mejora la vida de parados y rentas bajas durante 2 trimestres).' },
];
// ============================================================
//  MISIONES
//  gen(G) -> parámetros; check(G, party, p) -> {done, progress}
//  Los objetivos se escalan con la duración de la partida (en años).
// ============================================================
const MISSION_CATS = { economia: 'Economía', bienestar: 'Bienestar', poder: 'Poder', reglas: 'Reglas del juego', partido: 'Partido', identidad: 'Identidad', sombra: 'Agenda oscura' };
// Probabilidad de que una carta de misión sea una «agenda oscura» (que algo vaya mal)
const BAD_MISSION_SHARE = 0.2;
const gameYears = G => Math.max(2, G.maxTurns / 4);
const LAW_GOALS = [
  { path: 'comp.sanidad', value: 'cantonal', text: 'la sanidad esté transferida a los cantones' },
  { path: 'comp.sanidad', value: 'nacional', text: 'la sanidad sea competencia del Estado' },
  { path: 'comp.educacion', value: 'cantonal', text: 'la educación esté transferida a los cantones' },
  { path: 'comp.transporte', value: 'cantonal', text: 'el transporte esté transferido a los cantones' },
  { path: 'comp.social', value: 'compartida', text: 'los asuntos sociales sean una competencia compartida' },
  { path: 'comp.seguridad', value: 'cantonal', text: 'cada cantón tenga su propia policía' },
  { path: 'sistemaElectoral', value: 'proporcional_nacional', text: 'el sistema electoral sea proporcional en circunscripción única' },
  { path: 'sistemaElectoral', value: 'mayoritario', text: 'el sistema electoral sea mayoritario' },
  { path: 'matrimonio', value: true, text: 'el matrimonio igualitario sea legal' },
  { path: 'matrimonio', value: false, text: 'el matrimonio igualitario no esté reconocido' },
  { path: 'cannabis', value: true, text: 'el cannabis sea legal' },
  { path: 'eutanasia', value: 2, text: 'la eutanasia sea legal también por sufrimiento insoportable' },
  { path: 'eutanasia', value: 0, text: 'la eutanasia esté prohibida' },
  { path: 'servicioMilitar', value: true, text: 'el servicio militar sea obligatorio' },
  { path: 'rentaBasica', value: true, text: 'exista una renta básica universal' },
  { path: 'energia', value: 'renovable', text: 'el modelo energético sea renovable' },
  { path: 'energia', value: 'nuclear', text: 'el modelo energético sea nuclear' },
  { path: 'energia', value: 'fosil', text: 'el modelo energético se base en combustibles fósiles' },
  { path: 'inmigracion', value: 4, text: 'la política migratoria sea de fronteras cerradas' },
  { path: 'inmigracion', value: 0, text: 'la política migratoria sea de fronteras abiertas' },
  { path: 'lenguas', value: true, text: 'las lenguas cantonales sean cooficiales' },
  { path: 'religionEscuela', value: true, text: 'la religión sea asignatura evaluable' },
  { path: 'votoObligatorio', value: true, text: 'el voto sea obligatorio' },
  { path: 'edadVoto', value: 16, text: 'se pueda votar desde los 16 años' },
  { path: 'judicial', value: 0, text: 'los jueces sean elegidos por el Gobierno' },
  { path: 'fiscalia', value: true, text: 'exista una Fiscalía anticorrupción' },
  { path: 'empresasPublicas', value: 0, text: 'se privaticen todas las empresas públicas' },
  { path: 'empresasPublicas', value: 4, text: 'la economía esté estatalizada' },
  { path: 'aranceles', value: 0, text: 'no haya aranceles a la importación' },
  { path: 'curriculo', value: 'comun', text: 'el currículo escolar sea común para todo el país' },
  { path: 'curriculo', value: 'cantonal', text: 'cada cantón decida su currículo escolar' },
  { path: 'simbolos', value: 'nacional', text: 'solo la bandera y el himno nacionales sean oficiales' },
  { path: 'selecciones', value: true, text: 'los cantones puedan tener sus propias selecciones deportivas' },
  { path: 'derechoDecidir', value: 'pactada', text: 'se permitan las consultas de autodeterminación pactadas' },
  { path: 'armasCiviles', value: 2, text: 'la tenencia de armas sea libre' },
  { path: 'armasCiviles', value: 0, text: 'la tenencia de armas esté prohibida' },
  { path: 'penal', value: 2, text: 'el código penal sea punitivo' },
  { path: 'penal', value: 0, text: 'el código penal sea garantista' },
  { path: 'desahucios', value: 0, text: 'los desahucios de primera vivienda estén prohibidos' },
  { path: 'bancoCentral', value: 'gobierno', text: 'el banco central obedezca al Gobierno' },
  { path: 'tvPublica', value: 'gubernamental', text: 'la televisión pública esté controlada por el Gobierno' },
  { path: 'aborto', value: 0, text: 'el aborto esté prohibido' },
  { path: 'transparencia', value: true, text: 'exista un portal de transparencia' },
];

const MISSIONS = [
  { id: 'pib', cat: 'economia', title: 'Motor económico',
    gen: G => ({ target: Math.round(G.eco.gdp * (1 + 0.022 * gameYears(G) * RNG.range(1.0, 1.4))) }),
    text: p => `Que el PIB del país alcance los ${fmt.bn(p.target)} anuales.`,
    check: (G, P, p) => ({ done: G.eco.gdp >= p.target, progress: `Ahora: ${fmt.bn(G.eco.gdp)}` }) },
  { id: 'paro', cat: 'economia', title: 'Pleno empleo',
    gen: G => ({ target: Math.max(0.035, +(G.eco.unemployment * RNG.range(0.55, 0.7)).toFixed(3)) }),
    text: p => `Que el paro baje del ${fmt.pct(p.target)}.`,
    check: (G, P, p) => ({ done: G.eco.unemployment < p.target, progress: `Ahora: ${fmt.pct(G.eco.unemployment)}` }) },
  { id: 'deuda', cat: 'economia', title: 'Cuentas saneadas',
    gen: G => ({ target: Math.max(0.25, Math.round((G.eco.debtRatio - 0.03 * gameYears(G) * RNG.range(0.8, 1.2)) * 100) / 100) }),
    text: p => `Que la deuda pública baje del ${fmt.pct(p.target, 0)} del PIB.`,
    check: (G, P, p) => ({ done: G.eco.debtRatio < p.target, progress: `Ahora: ${fmt.pct(G.eco.debtRatio, 0)}` }) },
  { id: 'renta', cat: 'economia', title: 'Un país más rico',
    gen: G => ({ target: Math.round(G.eco.gdpPerCapita * (1 + 0.018 * gameYears(G) * RNG.range(1, 1.4)) / 100) * 100 }),
    text: p => `Que la renta per cápita supere los ${fmt.int(p.target)} €.`,
    check: (G, P, p) => ({ done: G.eco.gdpPerCapita >= p.target, progress: `Ahora: ${fmt.int(G.eco.gdpPerCapita)} €` }) },
  { id: 'gini', cat: 'bienestar', title: 'Igualdad',
    gen: G => ({ target: +(G.eco.gini - RNG.range(0.025, 0.04)).toFixed(3) }),
    text: p => `Que el índice de Gini de desigualdad baje de ${fmt.num(p.target, 3)}.`,
    check: (G, P, p) => ({ done: G.eco.gini < p.target, progress: `Ahora: ${fmt.num(G.eco.gini, 3)}` }) },
  { id: 'balanza', cat: 'economia', title: 'Potencia exportadora', valid: G => G.eco.tradeBalance < 0,
    gen: () => ({ turns: 6 }),
    text: p => `Que la balanza comercial sea positiva durante ${p.turns} trimestres seguidos.`,
    check: (G, P, p) => ({ done: G.eco.tradeStreak >= p.turns, progress: `Racha actual: ${G.eco.tradeStreak}` }) },
  { id: 'presion', cat: 'economia', title: 'Menos impuestos',
    gen: G => ({ target: Math.round((G.eco.taxBurden - RNG.range(0.035, 0.05)) * 100) / 100 }),
    text: p => `Que la presión fiscal (impuestos sobre PIB) baje del ${fmt.pct(p.target, 0)}.`,
    check: (G, P, p) => ({ done: G.eco.taxBurden < p.target, progress: `Ahora: ${fmt.pct(G.eco.taxBurden)}` }) },
  { id: 'alimentos', cat: 'economia', title: 'Despensa propia', valid: G => (G.eco.foodNet || 0) < 0,
    gen: () => ({ turns: 4 }),
    text: p => `Que el país no necesite importar alimentos durante ${p.turns} trimestres seguidos.`,
    check: (G, P, p) => ({ done: G.eco.foodStreak >= p.turns, progress: `Racha actual: ${G.eco.foodStreak}` }) },
  { id: 'tecno', cat: 'economia', title: 'País industrial',
    gen: G => ({ target: +(((G.eco.sectorShare.muebles || 0) + (G.eco.sectorShare.textil || 0)) * RNG.range(1.3, 1.5) + 0.01).toFixed(3) }),
    text: p => `Que la industria (muebles y textil) supere el ${fmt.pct(p.target)} del PIB.`,
    check: (G, P, p) => { const v = (G.eco.sectorShare.muebles || 0) + (G.eco.sectorShare.textil || 0); return { done: v >= p.target, progress: `Ahora: ${fmt.pct(v)}` }; } },
  { id: 'salud', cat: 'bienestar', title: 'Sanidad de excelencia',
    gen: G => ({ target: Math.min(92, Math.round(G.eco.health + RNG.range(9, 13))) }),
    text: p => `Que la calidad sanitaria media llegue a ${p.target}/100.`,
    check: (G, P, p) => ({ done: G.eco.health >= p.target, progress: `Ahora: ${Math.round(G.eco.health)}/100` }) },
  { id: 'educ', cat: 'bienestar', title: 'Escuela modelo',
    gen: G => ({ target: Math.min(92, Math.round(G.eco.education + RNG.range(9, 13))) }),
    text: p => `Que la calidad educativa media llegue a ${p.target}/100.`,
    check: (G, P, p) => ({ done: G.eco.education >= p.target, progress: `Ahora: ${Math.round(G.eco.education)}/100` }) },
  { id: 'segur', cat: 'bienestar', title: 'Calles seguras',
    gen: G => ({ target: Math.min(92, Math.round(G.eco.security + RNG.range(9, 13))) }),
    text: p => `Que la seguridad ciudadana llegue a ${p.target}/100.`,
    check: (G, P, p) => ({ done: G.eco.security >= p.target, progress: `Ahora: ${Math.round(G.eco.security)}/100` }) },
  { id: 'emisiones', cat: 'bienestar', title: 'Planeta verde',
    gen: () => ({ target: RNG.pick([0.2, 0.25, 0.3]) }),
    text: p => `Reducir las emisiones un ${fmt.pct(p.target, 0)} respecto al inicio de la partida.`,
    check: (G, P, p) => ({ done: G.eco.emissions <= 100 * (1 - p.target), progress: `Índice: ${Math.round(G.eco.emissions)} (inicio 100)` }) },
  { id: 'poblacion', cat: 'bienestar', title: 'Tierra de oportunidades',
    gen: G => ({ target: Math.round(G.eco.population * (1 + 0.012 * gameYears(G) * RNG.range(1, 1.4))) }),
    text: p => `Que la población del país supere los ${fmt.people(p.target)} habitantes.`,
    check: (G, P, p) => ({ done: G.eco.population >= p.target, progress: `Ahora: ${fmt.people(G.eco.population)}` }) },
  { id: 'felicidad', cat: 'bienestar', title: 'Pueblo feliz',
    gen: G => ({ target: Math.min(85, Math.round(G.eco.happiness + RNG.range(8, 11))) }),
    text: p => `Que la satisfacción ciudadana llegue a ${p.target}/100.`,
    check: (G, P, p) => ({ done: G.eco.happiness >= p.target, progress: `Ahora: ${Math.round(G.eco.happiness)}/100` }) },
  { id: 'presidente', cat: 'poder', title: 'Palacio de Gobierno',
    gen: () => ({}), text: () => 'Que tu candidato sea investido presidente del Gobierno.',
    check: (G, P) => ({ done: G.gov.president === P.id, progress: G.gov.president === P.id ? 'Eres presidente' : 'Aún no' }) },
  { id: 'escanos', cat: 'poder', national: true, title: 'Gran grupo parlamentario', valid: G => G.maxTurns > G.pol.legislatura * 4,
    gen: G => ({ target: Math.round(G.parliament.seats * RNG.range(0.28, 0.34)) }),
    text: p => `Obtener al menos ${p.target} escaños en unas elecciones generales (las fundacionales no cuentan).`,
    check: (G, P, p) => ({ done: (P.stats.maxSeats || 0) >= p.target, progress: `Récord: ${P.stats.maxSeats || 0} escaños` }) },
  { id: 'primera', cat: 'poder', national: true, title: 'Primera fuerza', valid: G => G.maxTurns > G.pol.legislatura * 4,
    gen: () => ({}), text: () => 'Ser el partido más votado en unas elecciones generales (las fundacionales no cuentan).',
    check: (G, P) => ({ done: !!P.stats.wonPopularVote, progress: P.stats.wonPopularVote ? 'Conseguido' : 'Aún no' }) },
  { id: 'cantones', cat: 'poder', national: true, title: 'Poder territorial',
    gen: G => ({ target: Math.max(2, Math.ceil(G.cantons.length / 2)) }),
    text: p => `Gobernar ${p.target} cantones a la vez.`,
    check: (G, P, p) => { const n = G.cantons.filter(c => c.gov.president === P.id).length; return { done: n >= p.target, progress: `Ahora gobiernas ${n}` }; } },
  // --- misiones propias de los partidos regionalistas ---
  { id: 'feudo', cat: 'poder', title: 'Gobernar la tierra', regionalOnly: true,
    gen: () => ({}), text: () => 'Presidir el gobierno de uno de los cantones de tu tierra.',
    check: (G, P) => { const ok = (P.region || [P.regional]).some(i => G.cantons[i] && G.cantons[i].gov.president === P.id); return { done: ok, progress: ok ? 'Gobiernas en tu tierra' : 'Aún no' }; } },
  { id: 'llave', cat: 'poder', title: 'Partido bisagra', regionalOnly: true,
    gen: () => ({}), text: () => 'Que tus diputados sean decisivos: entrar en el Gobierno nacional con al menos un ministerio.',
    check: (G, P) => { const n = Object.values(G.gov.ministers).filter(x => x === P.id).length; return { done: n >= 1, progress: `Ministerios: ${n}` }; } },
  { id: 'autogobierno', cat: 'reglas', title: 'Más autogobierno', regionalOnly: true,
    gen: () => ({ target: 3 }), text: p => `Que al menos ${p.target} materias sean de los cantones o compartidas.`,
    check: (G, P, p) => { const n = Object.values(G.pol.comp).filter(v => v !== 'nacional').length; return { done: n >= p.target, progress: `Ahora: ${n}` }; } },
  { id: 'hegemonia', cat: 'poder', title: 'Hegemonía en casa', regionalOnly: true,
    gen: () => ({}), text: () => 'Conseguir la mayoría absoluta en el parlamento de tu cantón.',
    check: (G, P) => { const c = G.cantons[P.regional]; const s = c ? c.parliament.composition[P.id] || 0 : 0; return { done: !!c && s >= absMajority(c.parliament.seats), progress: c ? `${s} de ${c.parliament.seats} escaños` : '' }; } },
  { id: 'ministerios', cat: 'poder', title: 'Socio de gobierno',
    gen: () => ({ target: 3 }), text: p => `Ocupar al menos ${p.target} ministerios a la vez.`,
    check: (G, P, p) => { const n = Object.values(G.gov.ministers).filter(x => x === P.id).length; return { done: n >= p.target, progress: `Ahora: ${n}` }; } },
  { id: 'legislador', cat: 'partido', title: 'Máquina legislativa',
    gen: G => ({ target: Math.max(3, Math.round(gameYears(G) * 0.9)) }), text: p => `Conseguir que se aprueben ${p.target} leyes propuestas por tu partido.`,
    check: (G, P, p) => ({ done: P.stats.lawsPassed >= p.target, progress: `Aprobadas: ${P.stats.lawsPassed}` }) },
  { id: 'ley', cat: 'reglas', title: 'Agenda legislativa', multi: true,
    gen: G => { const opts = LAW_GOALS.filter(l => getPath(G.pol, l.path) !== l.value); return { goal: RNG.pick(opts) }; },
    text: p => `Que al final de un trimestre ${p.goal.text}.`,
    check: (G, P, p) => ({ done: getPath(G.pol, p.goal.path) === p.goal.value, progress: getPath(G.pol, p.goal.path) === p.goal.value ? 'Se cumple ahora' : 'Aún no' }) },
  // --- más misiones de economía y bienestar ---
  { id: 'inflacion', cat: 'economia', title: 'Precios estables', valid: G => G.eco.inflation > 0.03,
    gen: G => ({ target: 0.025 }), text: p => `Que la inflación baje del ${fmt.pct(p.target, 1)}.`,
    check: (G, P, p) => ({ done: G.eco.inflation < p.target, progress: `Ahora: ${fmt.pct(G.eco.inflation, 1)}` }) },
  { id: 'superavit', cat: 'economia', title: 'Superávit', valid: G => G.eco.deficitRatio > 0,
    gen: () => ({}), text: () => 'Que el Estado cierre un año con superávit (ingresos mayores que gastos).',
    check: G => ({ done: G.eco.deficitRatio < 0, progress: `Ahora: ${G.eco.deficitRatio > 0 ? 'déficit' : 'superávit'} del ${fmt.pct(Math.abs(G.eco.deficitRatio), 1)}` }) },
  { id: 'obraNueva', cat: 'economia', title: 'País en obras',
    gen: G => ({ target: Math.max(20, Math.round(G.citizens.length / 40 * gameYears(G) * RNG.range(0.8, 1.1) / 4) * 4) }),
    text: p => `Que se terminen ${fmt.int(p.target)} viviendas nuevas a lo largo de la partida.`,
    check: (G, P, p) => { const n = sum(G.eco.history || [], x => x.built || 0); return { done: n >= p.target, progress: `Terminadas: ${fmt.int(n)}` }; } },
  { id: 'pisoAsequible', cat: 'bienestar', title: 'Vivienda asequible', valid: G => !!(G.eco.housing && G.eco.housing.price),
    gen: G => ({ target: Math.round(G.eco.housing.price.piso * RNG.range(0.85, 0.9)) }),
    text: p => `Que el precio medio de un piso baje de ${fmt.int(p.target)} mil €.`,
    check: (G, P, p) => { const v = G.eco.housing ? G.eco.housing.price.piso : 0; return { done: v > 0 && v < p.target, progress: `Ahora: ${fmt.int(v)} mil €` }; } },
  { id: 'socialMision', cat: 'bienestar', title: 'Nadie atrás',
    gen: G => ({ target: Math.min(92, Math.round(G.eco.social + RNG.range(9, 13))) }),
    text: p => `Que la calidad de los servicios sociales llegue a ${p.target}/100.`,
    check: (G, P, p) => ({ done: G.eco.social >= p.target, progress: `Ahora: ${Math.round(G.eco.social)}/100` }) },
  { id: 'transporteMision', cat: 'bienestar', title: 'País conectado',
    gen: G => ({ target: Math.min(92, Math.round(G.eco.transport + RNG.range(9, 13))) }),
    text: p => `Que la calidad del transporte llegue a ${p.target}/100.`,
    check: (G, P, p) => ({ done: G.eco.transport >= p.target, progress: `Ahora: ${Math.round(G.eco.transport)}/100` }) },
  { id: 'idh', cat: 'bienestar', title: 'Desarrollo humano',
    gen: G => ({ target: Math.min(0.97, +(G.eco.hdi + RNG.range(0.025, 0.035)).toFixed(3)) }),
    text: p => `Que el índice de desarrollo humano llegue a ${fmt.num(p.target, 3)}.`,
    check: (G, P, p) => ({ done: G.eco.hdi >= p.target, progress: `Ahora: ${fmt.num(G.eco.hdi, 3)}` }) },
  { id: 'nivelVida', cat: 'bienestar', title: 'Clase media',
    gen: G => ({ target: Math.min(0.85, +(((G.eco.wealthHist || []).slice(5).reduce((a, b) => a + b, 0) / Math.max(1, (G.eco.wealthHist || []).reduce((a, b) => a + b, 0))) + RNG.range(0.08, 0.12)).toFixed(2)) }),
    text: p => `Que el ${fmt.pct(p.target, 0)} de la gente viva en hogares con nivel de vida 6 o más.`,
    check: (G, P, p) => { const w = G.eco.wealthHist || [], t = w.reduce((a, b) => a + b, 0), v = t ? w.slice(5).reduce((a, b) => a + b, 0) / t : 0; return { done: v >= p.target, progress: `Ahora: ${fmt.pct(v, 0)}` }; } },
  // --- poder ---
  { id: 'absoluta', cat: 'poder', national: true, title: 'Rodillo', valid: G => G.maxTurns > G.pol.legislatura * 4,
    gen: () => ({}), text: () => 'Lograr la mayoría absoluta en unas elecciones generales (las fundacionales no cuentan).',
    check: (G, P) => ({ done: (P.stats.maxSeats || 0) >= absMajority(G.parliament.seats), progress: `Récord: ${P.stats.maxSeats || 0} de ${absMajority(G.parliament.seats)} escaños` }) },
  { id: 'enGobierno', cat: 'poder', title: 'Tocar poder',
    gen: () => ({ target: 4 }), text: p => `Estar en el Gobierno nacional (presidencia o algún ministerio) ${p.target} trimestres seguidos.`,
    check: (G, P, p) => ({ done: (P.stats.govStreak || 0) >= p.target, progress: `Racha: ${P.stats.govStreak || 0}` }) },
  // --- identidad y territorio ---
  { id: 'fervorTierra', cat: 'identidad', title: 'Despertar nacional', regionalOnly: true,
    gen: G => ({ target: 0.6 }), text: p => `Que el fervor cantonalista de alguno de tus cantones supere el ${fmt.pct(p.target, 0)}.`,
    check: (G, P, p) => { const v = Math.max(0, ...(P.region || [P.regional]).map(i => G.cantons[i] && G.cantons[i].ferv ? G.cantons[i].ferv.can : 0)); return { done: v >= p.target, progress: `Ahora: ${fmt.pct(v, 0)}` }; } },
  { id: 'conciertoPropio', cat: 'identidad', title: 'La llave de la caja', regionalOnly: true,
    gen: () => ({}), text: () => 'Que alguno de tus cantones tenga concierto económico.',
    check: (G, P) => { const ok = (P.region || [P.regional]).some(i => (G.pol.concierto || []).includes(i)); return { done: ok, progress: ok ? 'Lo tiene' : 'Aún no' }; } },
  { id: 'escuelaPropia', cat: 'identidad', title: 'Lengua viva', regionalOnly: true,
    gen: () => ({}), text: () => 'Que alguno de tus cantones tenga a la vez inmersión lingüística y televisión pública propia.',
    check: (G, P) => { const ok = (P.region || [P.regional]).some(i => G.cantons[i] && G.cantons[i].pol.lengua && G.cantons[i].pol.tv); return { done: ok, progress: ok ? 'Se cumple' : 'Aún no' }; } },
  { id: 'unaNacion', cat: 'identidad', title: 'Una sola nación', regionalOnly: true, valid: G => (G.cultures || []).some(cu => cu.id > 0 && cu.region && cu.region.length >= 2),
    gen: () => ({}), text: () => 'Fusionar dos cantones de tu tierra en uno solo.',
    check: (G, P) => { const ok = G.cantons.some(c => c.merged != null && (P.region || []).includes(c.merged) && G.cantons[c.merged].cul === P.cul); return { done: ok, progress: ok ? 'Hecho' : 'Aún no' }; } },
  { id: 'cohesion', cat: 'identidad', national: true, title: 'Cohesión nacional', valid: G => G.cantons.some(c => !c.merged && c.ferv && c.ferv.can >= 0.4),
    gen: () => ({ target: 0.4 }), text: p => `Que ningún cantón tenga un fervor cantonalista del ${fmt.pct(p.target, 0)} o más.`,
    check: (G, P, p) => { const v = Math.max(0, ...G.cantons.filter(c => !c.merged).map(c => c.ferv ? c.ferv.can : 0)); return { done: v < p.target, progress: `El más alto: ${fmt.pct(v, 0)}` }; } },
  { id: 'patria', cat: 'identidad', national: true, title: 'Orgullo nacional',
    gen: G => ({ target: Math.min(0.6, +((G.eco.ferv ? G.eco.ferv.cen : 0.2) + RNG.range(0.08, 0.12)).toFixed(2)) }),
    text: p => `Que el fervor centralista del país llegue al ${fmt.pct(p.target, 0)}.`,
    check: (G, P, p) => { const v = G.eco.ferv ? G.eco.ferv.cen : 0; return { done: v >= p.target, progress: `Ahora: ${fmt.pct(v, 0)}` }; } },
  { id: 'mapaNuevo', cat: 'identidad', national: true, title: 'Nuevo mapa', valid: G => G.cantons.filter(c => !c.merged).length > 3,
    gen: () => ({}), text: () => 'Que dos cantones se fusionen en uno (gobiernes o no alguno de ellos).',
    check: G => ({ done: G.cantons.some(c => c.merged != null), progress: 'Aún no' }) },
  // --- agenda oscura: que algo vaya mal (sin que se note que lo buscas) ---
  { id: 'paroSube', cat: 'sombra', bad: true, title: 'Cuanto peor, mejor',
    gen: G => ({ target: +Math.min(0.3, G.eco.unemployment * RNG.range(1.3, 1.45) + 0.02).toFixed(3) }),
    text: p => `Que el paro suba por encima del ${fmt.pct(p.target)}.`,
    check: (G, P, p) => ({ done: G.eco.unemployment > p.target, progress: `Ahora: ${fmt.pct(G.eco.unemployment)}` }) },
  { id: 'deudaSube', cat: 'sombra', bad: true, title: 'Herencia envenenada',
    gen: G => ({ target: Math.round((G.eco.debtRatio + RNG.range(0.12, 0.18)) * 100) / 100 }),
    text: p => `Que la deuda pública supere el ${fmt.pct(p.target, 0)} del PIB.`,
    check: (G, P, p) => ({ done: G.eco.debtRatio > p.target, progress: `Ahora: ${fmt.pct(G.eco.debtRatio, 0)}` }) },
  { id: 'inflacionAlta', cat: 'sombra', bad: true, title: 'La cesta por las nubes',
    gen: G => ({ target: +Math.max(0.055, G.eco.inflation + RNG.range(0.03, 0.04)).toFixed(3) }),
    text: p => `Que la inflación supere el ${fmt.pct(p.target, 1)}.`,
    check: (G, P, p) => ({ done: G.eco.inflation > p.target, progress: `Ahora: ${fmt.pct(G.eco.inflation, 1)}` }) },
  { id: 'recesion', cat: 'sombra', bad: true, title: 'Recesión',
    gen: () => ({ target: -0.005 }), text: () => 'Que el PIB caiga respecto al mismo trimestre del año anterior.',
    check: (G, P, p) => ({ done: (G.eco.history || []).length > 4 && G.eco.growth < p.target, progress: `Crecimiento anual: ${fmt.pct(G.eco.growth || 0, 1)}` }) },
  { id: 'descontento', cat: 'sombra', bad: true, title: 'Malestar',
    gen: G => ({ target: Math.max(15, Math.round(G.eco.happiness - RNG.range(9, 12))) }),
    text: p => `Que la satisfacción ciudadana baje de ${p.target}/100.`,
    check: (G, P, p) => ({ done: G.eco.happiness < p.target, progress: `Ahora: ${Math.round(G.eco.happiness)}/100` }) },
  { id: 'crimenSube', cat: 'sombra', bad: true, title: 'Inseguridad',
    gen: G => ({ target: +((G.eco.crime || 30) * RNG.range(1.25, 1.35)).toFixed(1) }),
    text: p => `Que la delincuencia suba por encima de ${fmt.num(p.target, 1)} delitos por cada 1.000 habitantes.`,
    check: (G, P, p) => ({ done: (G.eco.crime || 0) > p.target, progress: `Ahora: ${fmt.num(G.eco.crime || 0, 1)}` }) },
  { id: 'pisoCaro', cat: 'sombra', bad: true, title: 'Burbuja', valid: G => !!(G.eco.housing && G.eco.housing.price),
    gen: G => ({ target: Math.round(G.eco.housing.price.piso * RNG.range(1.25, 1.35)) }),
    text: p => `Que el precio medio de un piso supere los ${fmt.int(p.target)} mil €.`,
    check: (G, P, p) => { const v = G.eco.housing ? G.eco.housing.price.piso : 0; return { done: v > p.target, progress: `Ahora: ${fmt.int(v)} mil €` }; } },
  { id: 'desigualdad', cat: 'sombra', bad: true, title: 'Brecha',
    gen: G => ({ target: +(G.eco.gini + RNG.range(0.025, 0.035)).toFixed(3) }),
    text: p => `Que el índice de Gini de desigualdad supere ${fmt.num(p.target, 3)}.`,
    check: (G, P, p) => ({ done: G.eco.gini > p.target, progress: `Ahora: ${fmt.num(G.eco.gini, 3)}` }) },
  { id: 'deficitAlto', cat: 'sombra', bad: true, title: 'Agujero',
    gen: G => ({ target: +Math.max(0.05, G.eco.deficitRatio + RNG.range(0.03, 0.04)).toFixed(3) }),
    text: p => `Que el déficit público supere el ${fmt.pct(p.target, 1)} del PIB.`,
    check: (G, P, p) => ({ done: G.eco.deficitRatio > p.target, progress: `Ahora: ${fmt.pct(G.eco.deficitRatio, 1)}` }) },
  { id: 'descentralizar', cat: 'reglas', title: 'Estado federal',
    gen: () => ({ target: 3 }), text: p => `Que al menos ${p.target} materias estén transferidas a los cantones (las compartidas cuentan como media).`,
    check: (G, P, p) => { const n = sum(Object.values(G.pol.comp), v => v === 'cantonal' ? 1 : v === 'compartida' ? 0.5 : 0); return { done: n >= p.target, progress: `Transferidas: ${fmt.num(n, 1)}` }; } },
];

// Utilidades para rutas tipo "gasto.sanidad"
function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }
function setPath(obj, path, val) {
  const ks = path.split('.');
  let o = obj;
  for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) o[ks[i]] = {}; o = o[ks[i]]; }
  o[ks[ks.length - 1]] = val;
}

// ============================================================
//  ACCIONES DE PARTIDO (coste en PC y fondos en k€)
// ============================================================
const POLL_TIERS = [
  { id: 'basica', name: 'Barómetro básico', cost: 30, error: 0.035, desc: 'Intención de voto nacional (margen de error ±3,5 puntos).' },
  { id: 'cantonal', name: 'Encuesta por cantones', cost: 70, error: 0.025, desc: 'Intención de voto en cada cantón y proyección de escaños (±2,5).' },
  { id: 'sociologica', name: 'Estudio sociológico', cost: 130, error: 0.018, desc: 'Voto por profesión, edad, sexo, origen y nivel económico, más proyección (±2).' },
  { id: 'completa', name: 'Macroencuesta y valoración de leyes', cost: 200, error: 0.01, desc: 'Todo lo anterior, el mapa ideológico de la ciudadanía y qué leyes desea la gente (±1).' },
];

const CORRUPTION_ACTIONS = [
  { id: 'sobres', name: 'Financiación irregular', icon: 'hand-coins', pc: 0, funds: 0, evidence: 2,
    desc: 'Un empresario "amigo" te entrega dinero en B. Ganas entre 150 y 300 k€.' },
  { id: 'comisiones', name: 'Comisiones por obra pública', icon: 'receipt', pc: 1, funds: 0, evidence: 3, needsGov: true,
    desc: 'Amañas una adjudicación donde gobiernas. Ganas entre 250 y 450 k€ y la obra pública se encarece.' },
  { id: 'clientelismo', name: 'Red clientelar', icon: 'handshake', pc: 1, funds: 80, evidence: 2, needsCanton: true,
    desc: 'Empleos y favores a cambio de votos en un cantón que gobiernas. Fuerte subida de apoyo allí.' },
  { id: 'espionaje', name: 'Fontanería: espiar a un rival', icon: 'eye', pc: 1, funds: 100, evidence: 1, target: true,
    desc: 'Descubres cuántas pruebas comprometedoras acumula un rival. Si tiene suficientes, puedes filtrarlas a la prensa.' },
  { id: 'abogados', name: 'Destruir pruebas', icon: 'gavel', pc: 1, funds: 120, evidence: -1.5,
    desc: 'Buenos abogados y trituradoras. Reduce tus pruebas acumuladas.' },
];

// ============================================================
//  EVENTOS ALEATORIOS
// ============================================================
const EVENTS = [
  { id: 'crisis', w: 1, title: 'Crisis financiera mundial', text: 'Los mercados se desploman en todo el mundo. El crecimiento se resiente.',
    apply: G => { G.eco.shock -= 0.08; } },
  { id: 'boom', w: 1, title: 'Boom de las materias primas', text: 'El grano, la madera y el algodón se disparan en los mercados internacionales.',
    apply: G => { G.world.prices.grano *= 1.3; G.world.prices.madera *= 1.3; G.world.prices.tejido *= 1.25; } },
  { id: 'energia_baja', w: 1, title: 'Se hunde el precio de la energía', text: 'Un exceso de oferta mundial abarata el gas y el carbón: producir sale más barato.',
    apply: G => { G.world.prices.carbon *= 0.7; } },
  { id: 'sequia', w: 1, title: 'Sequía histórica', text: 'La falta de lluvias arruina las cosechas en {canton}.',
    apply: (G, c) => { c.shock.agricultura = (c.shock.agricultura || 0) - 0.5; c.shock.ganaderia = (c.shock.ganaderia || 0) - 0.2; } , canton: true },
  { id: 'inundacion', w: 0.8, title: 'Inundaciones', text: 'Graves inundaciones en {canton}. La ciudadanía mira a sus gobernantes.',
    apply: (G, c) => { c.shock.all = (c.shock.all || 0) - 0.1; c.disaster = 2; }, canton: true },
  { id: 'pandemia', w: 0.5, title: 'Epidemia', text: 'Un nuevo virus satura los hospitales. Las fábricas paran y la sanidad se pone a prueba.',
    apply: G => { G.eco.shock -= 0.06; G.eco.sectorShock.textil = -0.3; G.eco.sectorShock.muebles = -0.3; G.eco.pandemic = 3; } },
  { id: 'tecno', w: 1, title: 'Avance tecnológico', text: 'Nuevas máquinas disparan la productividad de las fábricas del país.',
    apply: G => { G.eco.sectorShock.textil = 0.2; G.eco.sectorShock.muebles = 0.2; } },
  { id: 'refugiados', w: 0.8, title: 'Crisis de refugiados', text: 'Miles de personas huyen de un conflicto en {foreign} y llegan a nuestras fronteras.',
    apply: (G, c, f) => { G.eco.refugees = 1; if (f && f.st) f.st.eco.refugeeOut = 2; }, foreign: true },
  { id: 'evento', w: 1, title: 'Gran feria internacional', text: '{canton} acoge una gran feria comercial. Sus empresas cierran pedidos récord.',
    apply: (G, c) => { c.shock.all = (c.shock.all || 0) + 0.15; }, canton: true },
  { id: 'crisis_vecino', w: 1, title: 'Recesión en {foreign}', text: '{foreign} entra en recesión y compra menos productos nuestros.',
    apply: (G, c, f) => { if (f && f.st) f.st.eco.shock -= 0.08; G.eco.shock -= 0.01; }, foreign: true },
  { id: 'turismo_record', w: 1, title: 'Lo nuestro se pone de moda', text: 'La ropa y los muebles del país se ponen de moda en las redes sociales.',
    apply: G => { G.world.prices.ropa *= 1.15; G.world.prices.muebles *= 1.15; } },
  { id: 'huelga', w: 0.7, title: 'Huelga general', text: 'Los sindicatos paralizan el país en protesta por la situación laboral.',
    cond: G => G.pol.laboral >= 3 || G.eco.unemployment > 0.15, apply: G => { G.eco.shock -= 0.03; G.eco.strike = 1; } },
  { id: 'ciber', w: 0.6, title: 'Ciberataque masivo', text: 'Un ataque informático paraliza bancos y administraciones durante días.',
    apply: G => { G.eco.shock -= 0.03; } },
  { id: 'inversion', w: 0.8, title: 'Llega una gran inversión extranjera', text: 'Una multinacional de {foreign} abrirá una fábrica en {canton}.',
    cond: G => G.pol.sociedades <= 0.25, apply: (G, c) => { c.shock.textil = (c.shock.textil || 0) + 0.3; c.invest = 2; }, canton: true, foreign: true },
  { id: 'incendio', w: 0.7, title: 'Incendio forestal', text: 'Un gran incendio arrasa miles de hectáreas en {canton}.',
    apply: (G, c) => { c.shock.silvicultura = (c.shock.silvicultura || 0) - 0.6; c.shock.agricultura = (c.shock.agricultura || 0) - 0.2; c.disaster = 1; }, canton: true },
];
