// ============================================================
//  PRENSA: cada trimestre, tres periódicos con líneas editoriales
//  distintas eligen y cuentan noticias diferentes.
// ============================================================
'use strict';

const OUTLETS = [
  { id: 'faro', name: 'El Faro', motto: 'Diario independiente de la mañana', lean: { eco: -1, soc: -1, ter: 0.3, ext: -0.6, aut: -0.8, amb: -0.8 }, style: 'progresista',
    likes: { packs: ['derechos', 'educacion', 'laboral', 'energia', 'sectorPublico'], kinds: ['plan', 'smi', 'comision', 'indulto'], topics: ['paro', 'desigualdad', 'sanidad', 'educacion', 'clima', 'vivienda'] } },
  { id: 'tribuna', name: 'La Tribuna', motto: 'Fundado para defender lo nuestro', lean: { eco: 1, soc: 1, ter: -0.7, ext: 0.6, aut: 0.9, amb: 0.5 }, style: 'conservador',
    likes: { packs: ['seguridad', 'extranjeria', 'territorial', 'fiscal', 'gobierno'], kinds: ['desfile', 'censura', 'disolucion', 'imprevisto'], topics: ['seguridad', 'inmigracion', 'deuda', 'impuestos'] } },
  { id: 'portico', name: 'Diario Pórtico', motto: 'Economía, empresas y mercados', lean: { eco: 0.7, soc: -0.3, ter: 0.5, ext: -0.9, aut: -0.4, amb: 0.4 }, style: 'liberal y económico',
    likes: { packs: ['presupuestos', 'comercio', 'fiscal', 'sectorPublico', 'energia'], kinds: ['economia', 'hacienda', 'tratadoNegociado', 'inauguracion', 'gobiernosCantonales', 'cantonales'], topics: ['crecimiento', 'inflacion', 'deuda', 'comercio', 'mercados', 'extranjero', 'empresas'] } },
];
// Cuánto le interesa a cada periódico un acontecimiento (además de su importancia)
function outletInterest(o, G, ev) {
  let x = 0;
  if (ev.kind === 'ley' && ev.prop) { if (o.likes.packs.includes(ev.prop.pack)) x += 2.2; x += Math.min(1.5, Math.abs(outletStance(o, G, ev.prop)) * 0.6); if (ev.prop.scope === 'cantonal' && o.id === 'portico') x += 1; }
  if (o.likes.kinds.includes(ev.kind)) x += 2;
  if (ev.topic && o.likes.topics.includes(ev.topic)) x += 2;
  if (ev.kind === 'escandalo' && ev.party) x += outletAffinity(o, partyById(G, ev.party)) > 0.1 ? -1.5 : 2.5;
  if (ev.kind === 'giro' && ev.party) x += 1;
  return x;
}

const pick = arr => arr[Math.floor(RNG.next() * arr.length)];
const listParties = (G, ids) => {
  const names = ids.map(id => partyById(G, id).short);
  return names.length <= 1 ? (names[0] || 'nadie') : names.slice(0, -1).join(', ') + ' y ' + names[names.length - 1];
};
// Afinidad del periódico con un partido (positivo = amigo)
function outletAffinity(o, party) {
  return -avg(AXIS_IDS, a => Math.abs(party.ideo[a] - o.lean[a] * 1.3)) + 1.2;
}
// ¿Le gusta al periódico este cambio de ley?
function outletStance(o, G, prop) {
  let s = 0;
  for (const fid in prop.changes) {
    const f = fieldById(G, fid); if (!f) continue;
    const a = f.pos(prop.prev[fid]), b = f.pos(prop.changes[fid]);
    for (const ax of new Set([...Object.keys(a), ...Object.keys(b)])) s += ((b[ax] ?? 0) - (a[ax] ?? 0)) * o.lean[ax];
  }
  return s;
}
function mostAffectedGroup(prop) {
  for (const fid in prop.changes) {
    const m = LAW_INTEREST[fid];
    if (m) { const k = Object.entries(m).sort((a, b) => b[1] - a[1])[0][0]; if (GROUP_NAMES[k]) return GROUP_NAMES[k]; }
  }
  return 'la ciudadanía';
}
// Cómo nombra la prensa cada campo (con artículo)
const NEWS_NOUN = {
  irpf: 'el IRPF', sociedades: 'el impuesto de sociedades', iva: 'el IVA', irpfPlano: 'el IRPF plano', nominas: 'el impuesto sobre las nóminas',
  sucesiones: 'el impuesto de sucesiones', ibi: 'el IBI', vacias: 'el impuesto sobre viviendas vacías',
  sindicatos: 'las subvenciones a los sindicatos', ciencia: 'la financiación de la ciencia', renovables: 'las ayudas a las renovables', carbono: 'el impuesto al carbono', salarioMin: 'el salario mínimo',
  laboral: 'la flexibilidad laboral', desempleo: 'la prestación por desempleo', pensiones: 'las pensiones', jubilacion: 'la edad de jubilación',
  empresasPublicas: 'el sector público empresarial', aranceles: 'los aranceles', proteccionNatural: 'la protección de los espacios naturales',
  aborto: 'la ley del aborto', penal: 'el código penal', inmigracion: 'la política migratoria', umbral: 'el umbral electoral', edadVoto: 'la edad para votar',
  legislatura: 'la legislatura', naturalizacion: 'el plazo para obtener la nacionalidad', solidaridad: 'la solidaridad entre cantones',
  judicial: 'la independencia judicial', energia: 'el modelo energético', sistemaElectoral: 'el sistema electoral', tvPublica: 'la televisión pública',
  financiacion: 'la financiación de los partidos', ct_irpf: 'el tramo cantonal del IRPF', ct_turismo: 'la promoción turística', ct_infra: 'la obra pública',
  ct_campo: 'las ayudas al campo', ct_sanidad: 'el gasto sanitario', ct_educacion: 'el gasto educativo', ct_seguridad: 'la policía cantonal',
  cupo: 'el cupo del concierto', ayudaInversion: 'las ayudas a la inversión empresarial', curriculo: 'el currículo escolar', simbolos: 'la ley de símbolos', derechoDecidir: 'la ley de consultas',
  ct_rotulacion: 'el uso de la lengua propia en la Administración', ct_fiestas: 'la promoción de la cultura propia',
};
const BOOL_SAY = {
  matrimonio: ['Se deroga el matrimonio igualitario', 'Se aprueba el matrimonio igualitario'],
  cannabis: ['Se prohíbe el cannabis', 'Se legaliza el cannabis'], rentaBasica: ['Adiós a la renta básica', 'Llega la renta básica universal'],
  religionEscuela: ['La religión sale de las aulas', 'La religión vuelve a ser evaluable'], servicioMilitar: ['Fin de la mili obligatoria', 'Vuelve la mili obligatoria'],
  lenguas: ['Una sola lengua oficial', 'Las lenguas cantonales serán cooficiales'], votoResidentes: ['Los residentes extranjeros pierden el voto', 'Los residentes extranjeros podrán votar'],
  votoObligatorio: ['El voto vuelve a ser voluntario', 'El voto será obligatorio'], limiteMandatos: ['Fin del límite de mandatos', 'Máximo de dos mandatos para el presidente'],
  transparencia: ['Cierra el portal de transparencia', 'Nace el portal de transparencia'], fiscalia: ['Se suprime la Fiscalía anticorrupción', 'Nace la Fiscalía anticorrupción'],
  ct_lengua: ['Fin de la inmersión lingüística', 'Inmersión lingüística en las escuelas'],
  selecciones: ['Solo la selección nacional podrá competir', 'Los cantones tendrán sus propias selecciones'], ct_tv: ['Cierra la televisión pública cantonal', 'Nace una televisión pública cantonal'],
  ct_exterior: ['Cierran las delegaciones del cantón en el exterior', 'El cantón abre delegaciones en el exterior'],
};
const AREA_NAMES = { sanidad: 'la sanidad', educacion: 'la educación', seguridad: 'la seguridad ciudadana', transporte: 'el transporte', social: 'los asuntos sociales' };
// Frase (oración corta) que describe el cambio de un campo
function fieldChangePhrase(G, fid, prev, next) {
  const f = fieldById(G, fid);
  if (fid.startsWith('tratado_')) return next === true ? `Tratado de libre comercio con ${f.name.replace('Tratado con ', '')}` : Array.isArray(next) && next.length ? `Tratado comercial parcial con ${f.name.replace('Tratado con ', '')} (${next.length} productos)` : `Se rompe el tratado con ${f.name.replace('Tratado con ', '')}`;
  if (BOOL_SAY[fid]) return BOOL_SAY[fid][next ? 1 : 0];
  if (f.cantonSet) {
    const a = (next || []).filter(i => !(prev || []).includes(i)), b = (prev || []).filter(i => !(next || []).includes(i));
    const nm = l => l.map(i => G.cantons[i] ? G.cantons[i].name : '?').join(' y ');
    return a.length && !b.length ? `Concierto económico para ${nm(a)}` : b.length && !a.length ? `${nm(b)} ${b.length > 1 ? 'pierden' : 'pierde'} el concierto económico` : `Cambian los conciertos económicos: ${(next || []).length ? nm(next) : 'ninguno'}`;
  }
  if (fid === 'eutanasia') return ['Se prohíbe la eutanasia', 'Eutanasia solo para enfermos terminales', 'Llega una ley de eutanasia amplia'][next];
  if (fid === 'aborto') return ['Se prohíbe el aborto', 'Aborto solo por supuestos', 'Ley de plazos para el aborto'][next];
  if (fid === 'derechoDecidir') return next === 'pactada' ? 'Luz verde a las consultas de autodeterminación pactadas' : 'Se prohíben las consultas de autodeterminación';
  if (fid.startsWith('c_')) { const area = AREA_NAMES[f.path.split('.')[1]]; return next === 'cantonal' ? `${cap(area)} pasa a los cantones` : next === 'compartida' ? `${cap(area)} será una competencia compartida` : `El Estado recupera ${area}`; }
  const where = fid.startsWith('ct_') ? ' cantonal' : '';
  if (f.optional && prev == null && next != null) return f.tax ? `Se crea ${NEWS_NOUN[f.tax] || 'el ' + f.short.toLowerCase()}${where} (${f.label(next)})` : `Aprobada la ley de ${f.name.toLowerCase()} (${f.label(next)})`;
  if (f.optional && prev != null && next == null) return f.tax ? `Se suprime ${NEWS_NOUN[f.tax] || 'el ' + f.short.toLowerCase()}${where}` : `Se deroga la ley de ${f.name.toLowerCase()}`;
  if (typeof next === 'number' && typeof prev === 'number') {
    const up = next > prev;
    if (f.path.startsWith('sub.')) return up ? `Más dinero para ${NEWS_NOUN[fid]} (${f.label(next)})` : `Recorte en ${NEWS_NOUN[fid]} (${f.label(next)})`;
    if (f.path.startsWith('gasto.')) return up ? `Más dinero para ${f.name.toLowerCase()} (${f.label(next)})` : `Recorte en ${f.name.toLowerCase()} (${f.label(next)})`;
    const noun = (f.tax ? NEWS_NOUN[f.tax] && NEWS_NOUN[f.tax] + where : NEWS_NOUN[fid]) || ('el ' + f.name.toLowerCase());
    const lbl = f.label(next), tail = /\d/.test(lbl) ? ` (${lbl.replace(/^./, c => c.toLowerCase())})` : ` hasta el nivel «${lbl}»`;
    return `${up ? (noun.startsWith('las ') || noun.startsWith('los ') ? 'Suben' : 'Sube') : (noun.startsWith('las ') || noun.startsWith('los ') ? 'Bajan' : 'Baja')} ${noun}${tail}`;
  }
  const noun = NEWS_NOUN[fid] || ('el ' + f.name.toLowerCase());
  return `Cambia ${noun}: ${f.label(next).toLowerCase()}`;
}
function lawPhrase(G, prop) {
  const fids = Object.keys(prop.changes);
  if (fids.length === 1) return fieldChangePhrase(G, fids[0], prop.prev[fids[0]], prop.changes[fids[0]]);
  const pk = packById(prop.pack);
  return pk.id === 'presupuestos' ? `Nuevos Presupuestos Generales (${fids.length} cambios)` : `Se reforma ${pk.noun || 'la ley'} (${fids.length} cambios)`;
}
function votersBy(G, prop, v) { return G.players.filter(p => prop.votes[p.id] === v && voterHasSeatsView(G, prop, p.id)).map(p => p.id); }
function voterHasSeatsView(G, prop, pid) {
  return prop.scope === 'cantonal' ? (G.cantons[prop.canton].parliament.composition[pid] || 0) > 0 : (G.parliament.composition[pid] || 0) > 0;
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
// «del socialismo», «de la moderación», «al liberalismo», «a la socialdemocracia»
function ideoArt(label, prep) {
  const w = label.toLowerCase(), fem = /(a|ión|dad)$/.test(w);
  return prep === 'de' ? (fem ? 'de la ' : 'del ') + w : (fem ? 'a la ' : 'al ') + w;
}

// Redacta un evento para un periódico concreto
function writeStory(G, o, ev) {
  const P = id => partyById(G, id);
  switch (ev.kind) {
    case 'elecciones': {
      const ids = Object.keys(ev.seats).sort((a, b) => (ev.shares[b] || 0) - (ev.shares[a] || 0));
      const w = P(ids[0]); const maj = absMajority(G.parliament.seats);
      const friend = outletAffinity(o, w) > 0;
      const head = ev.seats[w.id] >= maj ? `${w.short} logra la mayoría absoluta` : friend ? `Victoria de ${w.short}: ${ev.seats[w.id]} escaños` : `${w.short} gana pero lejos de la mayoría (${ev.seats[w.id]} de ${G.parliament.seats})`;
      return { headline: head, body: `Resultados: ${ids.map(id => `${P(id).short} ${fmt.pct(ev.shares[id] || 0, 1)} (${ev.seats[id] || 0})`).join(', ')}. Participación del ${fmt.pct(ev.turnout, 0)}.`, parties: ids.slice(0, 2) };
    }
    case 'cantonales': return { headline: 'Elecciones en los cantones', body: ev.results.map(r => { const best = Object.entries(r.seats).sort((a, b) => b[1] - a[1])[0]; return `${G.cantons[r.canton].name}: gana ${P(best[0]).short}`; }).join('. ') + '.' };
    case 'investidura': {
      const pres = P(ev.party);
      const friend = outletAffinity(o, pres) > 0;
      const sup = ev.supporters.length ? listParties(G, ev.supporters) : null;
      return { headline: friend ? `${pres.candidate.name}, presidente del Gobierno` : sup ? `${pres.candidate.name} llega a la presidencia de la mano de ${sup}` : `${pres.candidate.name} se hace con la presidencia`,
        body: `${pres.name} encabezará el Gobierno${sup ? ' con el apoyo de ' + sup : ''}.`, parties: [pres.id], portrait: pres.id };
    }
    case 'investiduraFallida': return { headline: 'Bloqueo: nadie logra la investidura', body: 'Ningún candidato reunió los apoyos necesarios. Habrá repetición electoral.' };
    case 'gobierno': case 'remodelacion': {
      const pres = P(ev.party);
      const by = {}; Object.entries(ev.ministers).forEach(([m, pid]) => (by[pid] = by[pid] || []).push(MINISTRIES.find(x => x.id === m).name));
      return { headline: ev.kind === 'gobierno' ? `Así es el Gobierno de ${pres.candidate.name}` : `${pres.candidate.name} remodela su Gobierno`,
        body: Object.entries(by).map(([pid, ms]) => `${P(pid).short}: ${ms.join(', ')}`).join('. ') + '.', parties: [pres.id] };
    }
    case 'ley': {
      const prop = ev.prop; const proposer = P(prop.proposer);
      const phrase = lawPhrase(G, prop);
      const yesP = votersBy(G, prop, 'si'), noP = votersBy(G, prop, 'no');
      const where = prop.scope === 'cantonal' ? ` en ${G.cantons[prop.canton].name}` : '';
      const supportTxt = prop.publicSupport ? ` La apoya el ${fmt.pct(prop.publicSupport.favor, 0)} de la ciudadanía y la rechaza el ${fmt.pct(prop.publicSupport.contra, 0)}.` : '';
      const tally = `Votos: ${prop.result.yes} a favor${yesP.length ? ' (' + listParties(G, yesP) + ')' : ''}, ${prop.result.no} en contra${noP.length ? ' (' + listParties(G, noP) + ')' : ''} y ${prop.result.abs} abstenciones.`;
      if (!ev.passed) return { headline: `${prop.decree ? 'Decae el decreto' : 'Tumbada la propuesta de ' + proposer.short}${where}: ${phrase.charAt(0).toLowerCase() + phrase.slice(1)}`, body: `La propuesta no salió adelante. ${tally}`, parties: [proposer.id] };
      const st = outletStance(o, G, prop);
      const group = mostAffectedGroup(prop);
      let head = phrase + where;
      const pub = prop.publicSupport, generic = /ciudadan/.test(group);
      const popular = pub ? pub.favor >= pub.contra : null;
      if (st > 0.3) {
        if (generic) head = popular === false ? pick([`${head} pese al ruido de la calle`, `${head}: una decisión valiente`]) : pick([`${head} con el aplauso de la ciudadanía`, `${head}, una medida respaldada en la calle`, head]);
        else head = pick([`${head}, una buena noticia para ${group}`, `${head} con el aplauso de ${group}`, head]);
      } else if (st < -0.3) {
        if (generic) head = popular === false ? pick([`${head} contra el criterio de la mayoría`, `${proposer.short} impone su ley: ${phrase.charAt(0).toLowerCase() + phrase.slice(1)}`]) : pick([`${proposer.short} se sale con la suya: ${phrase.charAt(0).toLowerCase() + phrase.slice(1)}`, `${head} entre dudas`]);
        else head = pick([`${head}: golpe a ${group}`, `${proposer.short} impone su ley: ${phrase.charAt(0).toLowerCase() + phrase.slice(1)}`, `${head} entre críticas de ${group}`]);
      }
      else if (prop.decree) head = `Convalidado el decreto: ${phrase.charAt(0).toLowerCase() + phrase.slice(1)}`;
      const multi = Object.keys(prop.changes).length > 1 ? ' Cambios: ' + proposalSummaryView(G, prop) + '.' : '';
      return { headline: cap(head), body: `${tally}${supportTxt}${multi}`, parties: [proposer.id], quoteFrom: prop };
    }
    case 'censura': {
      const c = P(ev.party), against = ev.against ? P(ev.against) : null;
      return ev.passed
        ? { headline: `${c.candidate.name} tumba al Gobierno con una moción de censura`, body: `${against ? against.name + ' pierde el poder. ' : ''}Votaron a favor: ${listParties(G, G.players.filter(p => ev.votes[p.id] === 'si').map(p => p.id))}.`, parties: [c.id], portrait: c.id }
        : { headline: `Fracasa la moción de censura de ${c.short}`, body: `El Gobierno resiste.`, parties: [c.id] };
    }
    case 'escandalo': {
      const p = P(ev.party); const friend = outletAffinity(o, p) > 0.1;
      return { headline: friend ? `La Justicia investiga a ${p.short} por el caso ${ev.caseName}` : `Escándalo en ${p.short}: estalla el caso ${ev.caseName}`,
        body: `${ev.cause}. El partido deberá pagar una multa de ${fmt.k(ev.fine)} y su candidato queda imputado.${ev.exposer ? ' Lo destapó ' + P(ev.exposer).name + '.' : ''}`, parties: [p.id], portrait: p.id };
    }
    case 'giro': {
      const p = P(ev.party); const ax = AXES.find(a => a.id === ev.axis);
      return { headline: `${p.short} gira: ${ideoArt(ev.from, 'de')} ${ideoArt(ev.to, 'a')}`, body: `Sus votaciones de los últimos meses en materia de ${ax.name.toLowerCase()} cambian la percepción del partido.`, parties: [p.id] };
    }
    case 'economia': {
      const gov = G.gov.president ? P(G.gov.president) : null;
      const friend = gov && outletAffinity(o, gov) > 0;
      let head = ev.text.replace(/\.$/, '').split(': ')[0].split('. ')[0];
      if (gov && ev.tone === 'bad' && ['recesion', 'paro', 'inflacion', 'deficit', 'fuga'].includes(ev.topic)) head = friend ? head + ' por el contexto internacional' : `Con ${gov.short} al mando: ${head.charAt(0).toLowerCase() + head.slice(1)}`;
      if (gov && ev.tone === 'good' && friend) head = `${head}: el Gobierno saca pecho`;
      return { headline: head, body: ev.text, section: ev.topic === 'paroCanton' || ev.topic === 'deudaCanton' ? 'cantones' : ev.topic === 'extranjero' ? 'internacional' : 'economia' };
    }
    case 'imprevisto': return { headline: ev.title, body: ev.text, section: ev.canton !== null && ev.canton !== undefined ? 'cantones' : ev.foreign ? 'internacional' : 'portada' };
    case 'mision': { const p = P(ev.party); return { headline: `Rumores en ${p.short}: «Ya tenemos ${ev.count} de nuestros objetivos»`, body: `Fuentes del partido aseguran que ha cumplido ${ev.count} de sus 3 objetivos secretos.`, parties: [p.id] }; }
    case 'disolucion': { const p = P(ev.party); return { headline: `${p.candidate.name} disuelve las Cortes: elecciones anticipadas`, body: 'Los ciudadanos volverán a las urnas al final del trimestre.', parties: [p.id], portrait: p.id }; }
    case 'indulto': { const p = P(ev.party), t = P(ev.target); return { headline: outletAffinity(o, p) > 0 ? `El Gobierno concede la medida de gracia a ${t.short}` : `Indulto polémico: el Gobierno perdona a ${t.short}`, body: 'La decisión divide a la opinión pública.', parties: [p.id, t.id] }; }
    case 'smi': return { headline: `El Gobierno ${ev.dir === 'up' ? 'sube' : 'baja'} el salario mínimo por decreto`, body: `Queda en el ${fmt.pct(ev.value, 0)} del salario medio.`, parties: [ev.party] };
    case 'plan': return { headline: ({ sanidad: 'Plan de choque en la sanidad pública', educacion: 'Plan de choque en la educación pública', transporte: 'Plan de obras urgente en todo el país', social: 'Plan de choque contra la pobreza', inversion: 'El Gobierno sale a captar inversores extranjeros' })[ev.area] || 'Nuevo plan del Gobierno', body: `Impulsado por el ministerio que dirige ${P(ev.party).short}.`, parties: [ev.party], section: ev.area === 'inversion' ? 'economia' : 'portada' };
    case 'hacienda': { const nm = k => (FIELDS['g_' + k] ? FIELDS['g_' + k].name : k).toLowerCase(); return { headline: `Hacienda mueve dinero de ${nm(ev.from)} a ${nm(ev.to)}`, body: `${num2(ev.amount || 0.5)} puntos de PIB sin pasar por el Parlamento.`, parties: [ev.party], section: 'economia' }; }
    case 'tratadoExterior': { const head = ev.text.replace(/\.$/, '').split(': ')[0]; return { headline: head, body: ev.text, section: 'internacional' }; }
    case 'tratadoNegociado': return { headline: `Acuerdo comercial con ${G.foreign.find(f => f.id === ev.foreign).name}`, body: 'El tratado deberá ratificarse en el Parlamento.', section: 'internacional' };
    case 'comision': return { headline: `${P(ev.party).short} impulsa una comisión de investigación sobre ${P(ev.target).short}`, body: '', parties: [ev.party, ev.target] };
    case 'nacionalizacion': return { headline: `${P(ev.party).short} nacionaliza ${ev.name.replace(/ \(pública\)$/, '')}`, body: `El ${ev.area === 'sanidad' ? 'centro sanitario' : 'centro educativo'} pasa a ser público tras pagar a sus dueños ${fmt.int((ev.price || 0) * 1000)} €. Su plantilla será personal público.`, section: 'cantones' };
    case 'privatizacion': return { headline: `${P(ev.party).short} privatiza ${ev.name}`, body: `Lo compra en subasta un particular por ${fmt.int((ev.price || 0) * 1000)} €. A partir de ahora cobrará a sus ${ev.area === 'sanidad' ? 'pacientes' : 'alumnos'}.`, section: 'cantones' };
    case 'nacionalizaEmpresa': return { headline: `${P(ev.party).short} nacionaliza ${ev.name.replace(/ \(pública\)$/, '')}`, body: `La ${(ev.kindName || 'empresa').toLowerCase()} pasa a ser pública tras pagar a sus dueños ${fmt.int((ev.price || 0) * 1000)} €. Su plantilla será funcionaria.`, section: 'economia' };
    case 'privatizaEmpresa': return { headline: `${P(ev.party).short} privatiza ${ev.name.replace(/ \(pública\)$/, '')}`, body: `La compra en subasta ${ev.buyer || 'un particular'} por ${fmt.int((ev.price || 0) * 1000)} €.`, section: 'economia' };
    case 'creaEmpresa': return { headline: `${P(ev.party).short} crea ${ev.name}`, body: `Empiezan las obras (${fmt.bn(ev.cost || 0)}). Cuando terminen, contratará a su plantilla con sueldo público.`, section: 'economia' };
    case 'cierraEmpresa': return { headline: `${P(ev.party).short} cierra ${ev.name}`, body: `${ev.staff ? `${ev.staff} personas se quedan sin trabajo en ${G.cantons[ev.canton].name}.` : ''}`, section: 'economia' };
    case 'precioPublico': return { headline: `${P(ev.party).short} fija el precio de ${(ev.goods || []).map(([g]) => GOODS[g].name.toLowerCase()).join(' y ')} en ${ev.name}`, body: (ev.goods || []).map(([g, pf, pm]) => `${GOODS[g].name}: ${fmt.int(pf * 1000)} € (el mercado paga ${fmt.int((pm || 0) * 1000)} €)`).join('. ') + '.', section: 'economia' };
    case 'inauguracion': return { headline: ev.name ? `${P(ev.party).short} abre ${ev.name}` : `${P(ev.party).short} inaugura obras en ${G.cantons[ev.canton].name}`, body: ev.name ? `Empiezan las obras. Cuando acaben, se contratará personal ${ev.area === 'sanidad' ? 'sanitario' : ev.area === 'educacion' ? 'docente' : ev.area === 'defensa' ? 'militar' : 'de seguridad'} según el presupuesto.` : '', section: 'cantones' };
    case 'cierreCentro': return { headline: `${P(ev.party).short} cierra ${ev.name}`, body: `Los vecinos de ${G.cantons[ev.canton].name} protestan: ${ev.area === 'sanidad' ? 'tendrán que ir más lejos al médico' : 'sus hijos tendrán que cambiar de colegio'}.`, section: 'cantones' };
    case 'desfile': return { headline: 'Gran desfile de las Fuerzas Armadas', body: '', parties: [ev.party] };
    case 'regionalista': {
      const cu = ev.cul != null && G.cultures ? G.cultures[ev.cul] : null, where = (ev.region && ev.region.length ? ev.region : [ev.canton]).map(i => G.cantons[i].name);
      return { headline: `${P(ev.party).short} se presenta como la voz de ${cu ? cu.name : where[0]}`, body: `${P(ev.party).name} solo concurrirá en ${where.join(' y ')}, donde aspira a gobernar y a ser decisivo en el Parlamento nacional.`, parties: [ev.party], section: 'cantones' };
    }
    case 'fervor': { const c = G.cantons[ev.canton], pc = Math.round(ev.th * 100);
      return ev.up ? { headline: `El fervor cantonalista ya supera el ${pc} % en ${c.name}`, body: 'La lengua, los símbolos y el dinero alimentan el sentimiento propio. Los partidos regionalistas se frotan las manos.', section: 'cantones' }
        : { headline: `El fervor cantonalista cae por debajo del ${pc} % en ${c.name}`, body: 'Cada vez son menos los que anteponen el cantón a todo lo demás.', section: 'cantones' }; }
    case 'renombre': return { headline: `${ev.old} pasa a llamarse ${ev.name}`, body: ev.party ? `Lo ha decidido el gobierno cantonal de ${P(ev.party).short}.` : '', parties: ev.party ? [ev.party] : [], section: 'cantones' };
    case 'fusion': return { headline: `${ev.oldA} y ${ev.oldB} se fusionan${ev.name !== ev.oldA ? ': nace ' + ev.name : ''}`, body: `Los dos cantones serán uno solo, con un Parlamento y un Gobierno comunes${ev.party ? ', presidido por ' + P(ev.party).short : ''}. En las próximas elecciones se repartirán de nuevo los escaños.`, parties: ev.party ? [ev.party] : [], section: 'cantones' };
    case 'fusionRechazada': return { headline: `${ev.nameB} rechaza fusionarse con ${ev.nameA}`, body: '', parties: [ev.party, ev.by].filter(Boolean), section: 'cantones' };
    case 'gobiernosCantonales': return { headline: 'Nuevos gobiernos en los cantones', body: ev.results.map(r => `${G.cantons[r.canton].name}: ${r.president ? P(r.president).short : '—'}${r.majority ? '' : ' (en minoría)'}`).join('. ') + '.', section: 'cantones' };
  }
  return null;
}
function proposalSummaryView(G, prop) {
  return Object.keys(prop.changes).map(fid => { const f = fieldById(G, fid); return `${f.name}: ${f.label(prop.changes[fid])}`; }).join('; ');
}
// Una cita de un líder sobre la ley más polémica
function opinionQuote(G, o, laws) {
  const law = laws.filter(e => e.passed && e.prop.scope === 'nacional')[0];
  if (!law) return null;
  const prop = law.prop;
  const group = mostAffectedGroup(prop);
  const against = G.players.filter(p => prop.votes[p.id] === 'no').sort((a, b) => outletAffinity(o, b) - outletAffinity(o, a));
  const pro = G.players.filter(p => prop.votes[p.id] === 'si').sort((a, b) => outletAffinity(o, b) - outletAffinity(o, a));
  const st = outletStance(o, G, prop);
  const speaker = st >= 0 ? pro[0] : against[0];
  if (!speaker) return null;
  const quotes = st >= 0
    ? [`Hoy es un día histórico para ${group}.`, 'Cumplimos lo que prometimos en campaña.', 'Este país avanza cuando se atreve.']
    : [`Es un ataque contra ${group}.`, 'La derogaremos en cuanto lleguemos al Gobierno.', 'Esta ley nos empobrece a todos.'];
  return { party: speaker.id, text: pick(quotes), about: packById(prop.pack).name };
}

// Piezas propias de cada periódico, sacadas de los datos (no de los acontecimientos del trimestre)
function exclusiveStories(G, o) {
  const e = G.eco, H = e.history, then = H[Math.max(0, H.length - 5)] || H[0] || {};
  if (G.turn < 1) return [];
  const P = v => fmt.pct(v, 1), out = [], add = (headline, body, section, imp) => out.push({ headline, body, section: section || 'portada', importance: imp || 4.2, kind: 'exclusiva' });
  const cs = G.cantons.slice();
  const worstU = cs.slice().sort((a, b) => b.stats.unemployment - a.stats.unemployment)[0];
  if (o.id === 'faro') {
    if (then.gini != null) add(e.gini > then.gini + 0.003 ? 'La desigualdad se dispara en el último año' : e.gini < then.gini - 0.003 ? 'La brecha entre ricos y pobres se estrecha' : 'La desigualdad no se mueve', `El índice de Gini se sitúa en ${fmt.num(e.gini, 3)}. Las organizaciones sociales piden más protección para las rentas bajas.`);
    const worstH = cs.slice().sort((a, b) => a.stats.health - b.stats.health)[0];
    if (worstH && worstH.stats.health < e.health - 3) add(`Listas de espera: ${worstH.name} suspende en sanidad`, `La calidad sanitaria allí es de ${Math.round(worstH.stats.health)}/100, frente a ${Math.round(e.health)}/100 de media.`);
    if (worstU) add(`${worstU.name}, a la cabeza del paro`, `El ${P(worstU.stats.unemployment)} de su población activa no tiene trabajo. Los sindicatos convocan concentraciones.`);
    if (e.emissions != null && Math.abs(e.emissions - 100) > 0.5) add(e.emissions > 100 ? 'Las emisiones siguen por encima del nivel de partida' : 'Las emisiones bajan, pero no lo suficiente', `Índice de emisiones: ${Math.round(e.emissions)} (100 al inicio de la legislatura). Los científicos piden acelerar la transición.`);
  } else if (o.id === 'tribuna') {
    const worstS = cs.slice().sort((a, b) => a.stats.security - b.stats.security)[0];
    if (worstS && worstS.stats.security < e.security - 2) add(`Inseguridad en ${worstS.name}: los vecinos piden más policía`, `La seguridad en el cantón se queda en ${Math.round(worstS.stats.security)}/100. Comerciantes y vecinos denuncian el abandono del Gobierno.`);
    add(e.debtRatio > 0.9 ? `La deuda roza el ${P(e.debtRatio)} del PIB: aviso a navegantes` : `La deuda pública, en el ${P(e.debtRatio)} del PIB`, `Cada ciudadano debe ya ${fmt.int(e.debt * 1e9 / Math.max(1, e.population))} €. ${e.deficitRatio > 0.03 ? 'El déficit sigue desbocado.' : 'Hay margen, pero no para despilfarrar.'}`);
    add(`Presión fiscal del ${P(e.taxBurden)}`, e.taxBurden > 0.38 ? 'Familias y autónomos, asfixiados a impuestos.' : 'Los contribuyentes respiran, pero piden más rebajas.');
    if (e.lastDemography) add('Radiografía de la inmigración', `Este trimestre llegaron ${fmt.int(e.lastDemography.immigrants)} personas. El debate sobre la integración vuelve a la calle.`);
  } else {
    add(`La prima de riesgo, en ${Math.round(spreadBps(G))} puntos`, `El Tesoro paga de media un ${P(e.interestRate)} por su deuda. ${spreadBps(G) > 150 ? 'Los inversores exigen más por prestar al país.' : 'Los mercados confían en las cuentas públicas.'}`, 'economia', 4.4);
    const tr = Object.values(e.trade || {}).sort((a, b) => Math.abs(b.net) - Math.abs(a.net))[0];
    if (tr) add(tr.net >= 0 ? `${tr.name}: el país vende más de lo que compra` : `${tr.name}: dependemos del exterior`, `Saldo comercial de ${fmt.sbn(tr.net)} al año en ${tr.name.toLowerCase()}.`, 'economia');
    const rich = G.foreign.slice().sort((a, b) => b.growth - a.growth)[0];
    if (rich) add(rich.growth > (e.growth || 0) ? `${rich.name} crece más que nosotros` : `Crecemos más que ${rich.name}`, `${rich.name} avanza un ${P(rich.growth)} anual frente al ${P(e.growth || 0)} del país.`, 'internacional');
    const bestC = cs.slice().sort((a, b) => b.budget.balance - a.budget.balance), lastC = bestC[bestC.length - 1];
    if (lastC && lastC.budget.balance < 0) add(`Las cuentas de ${lastC.name}, en números rojos`, `Su déficit es de ${fmt.bn(-lastC.budget.balance)}. ${bestC[0].budget.balance > 0 ? bestC[0].name + ', en cambio, cierra con superávit.' : ''}`, 'cantones');
  }
  return RNG.shuffle(out).slice(0, 3);
}
function buildNewspaper(G, events) {
  const evs = (events || []).slice();
  const prev = G.eco.history[G.eco.history.length - 2] || G.eco.history[0];
  const e = G.eco;
  const paper = {
    turn: G.turn, label: quarterLabel(G),
    economy: {
      gdp: e.gdp, qGrowth: e.qGrowth || 0, growth: e.growth || 0, unemployment: e.unemployment, dUnemp: e.unemployment - prev.unemployment,
      inflation: e.inflation, debtRatio: e.debtRatio, deficitRatio: e.deficitRatio, spread: spreadBps(G),
      dSpread: spreadBps(G) - (prev.spread ?? spreadBps(G)),
    },
    barometer: (G.barometers || []).slice(-1)[0] || null,
    prevBarometer: (G.barometers || []).slice(-2, -1)[0] || null,
    international: G.foreign.map(f => ({ id: f.id, name: f.name, growth: f.growth, leader: f.leader, govEco: f.govEco, treaty: !!G.pol.tratados[f.id] })),
    outlets: [],
  };
  const laws = evs.filter(x => x.kind === 'ley').sort((a, b) => b.importance - a.importance);
  // 1) Cada periódico puntúa cada acontecimiento según su línea
  const scored = OUTLETS.map(o => evs.map(ev => { const st = writeStory(G, o, ev); if (st) st.headline = st.headline.replace(/\bde el\b/g, 'del').replace(/\ba el\b/g, 'al'); return st ? { ev, st, score: (ev.importance || 3) - (ev.kind === 'ley' && !ev.passed ? 2 : 0) + outletInterest(o, G, ev) + RNG.next() * 0.8 } : null; }));
  // 2) Reparto: lo muy importante sale en todos; lo demás, solo en el periódico al que más le interesa
  //    (y en un segundo si también le interesa mucho). Así cada diario cuenta cosas distintas.
  const covers = OUTLETS.map(() => new Set());
  evs.forEach((ev, i) => {
    const ranks = OUTLETS.map((o, k) => ({ k, sc: scored[k][i] ? scored[k][i].score : -99 })).sort((a, b) => b.sc - a.sc);
    if (ranks[0].sc < -50) return;
    const top = ['elecciones', 'investidura', 'investiduraFallida', 'censura', 'disolucion'].includes(ev.kind) || (ev.kind === 'ley' && ev.passed && ev.prop && ev.prop.organic);
    ranks.forEach((r, pos) => { if (r.sc < -50) return; if (top || pos === 0 || (pos === 1 && r.sc >= (ev.importance || 3) + 2.5)) covers[r.k].add(i); });
  });
  const usedLeads = new Set();
  OUTLETS.forEach((o, k) => {
    const stories = [...covers[k]].map(i => Object.assign({ importance: scored[k][i].score, kind: evs[i].kind, section: scored[k][i].st.section || 'portada', evIdx: i }, scored[k][i].st));
    exclusiveStories(G, o).forEach(x => stories.push(x));
    stories.sort((a, b) => b.importance - a.importance);
    const front = stories.filter(s => s.section === 'portada' || s.section === 'economia');
    let lead = front.find(s => s.evIdx === undefined ? !usedLeads.has('x' + s.headline) : !usedLeads.has(s.evIdx)) || front[0];
    if (lead) usedLeads.add(lead.evIdx === undefined ? 'x' + lead.headline : lead.evIdx);
    lead = lead || { headline: 'Trimestre tranquilo en la política nacional', body: 'Sin grandes sobresaltos en el Parlamento.', kind: 'calma' };
    paper.outlets.push({
      id: o.id, name: o.name, motto: o.motto, style: o.style,
      lead, items: front.filter(s => s !== lead).slice(0, 6), cantons: stories.filter(s => s.section === 'cantones').slice(0, 4),
      international: stories.filter(s => s.section === 'internacional').slice(0, 3),
      quote: opinionQuote(G, o, laws),
    });
  });
  return paper;
}
