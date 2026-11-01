# Hemiciclo · versión 2.4 (3D y en línea)

Juego de estrategia parlamentaria para 3 a 7 jugadores, cada uno desde su casa. Uno de vosotros hace de **anfitrión** (su navegador lleva la partida) y los demás se unen con un código de sala. Todos jugáis cada fase a la vez y, cuando todo el mundo pulsa «listo», la partida avanza.

## Cómo jugar en línea

1. **Subid la carpeta a una web estática** (es lo más cómodo y fiable). Cualquiera de estas sirve y es gratis:
   - **Netlify Drop**: entrad en app.netlify.com/drop y arrastrad la carpeta `Hemiciclo 3D`. Os da una dirección que podéis pasar a los amigos.
   - **GitHub Pages**, **Cloudflare Pages** o cualquier hosting que sirva ficheros.
   
   Alternativa sin subir nada: cada jugador tiene una copia de la carpeta y abre `index.html` con Chrome, Edge o Firefox. Mientras todos tengáis la *misma versión* de los ficheros, también funciona.
2. El anfitrión escribe su nombre, deja marcado **«En línea»** y pulsa **Crear sala**. Aparece un código de 5 letras.
3. Los demás escriben su nombre, el código, y pulsan **Unirse**.
4. En la sala de espera el anfitrión elige la duración (4, 6 u 8 años = 16, 24 o 32 trimestres), el número de cantones y de países y, si quiere, una semilla para repetir un mundo. Con 3 jugadores o más se puede empezar.

La conexión es directa entre navegadores (WebRTC, mediante PeerJS). El servidor público de PeerJS solo sirve para que os encontréis; los datos de la partida van de navegador a navegador. En algunas redes muy restrictivas (empresas, ciertos móviles con CGNAT) la conexión directa puede fallar: probad con otra red o un móvil como punto de acceso.

**Importante para el anfitrión:** su pestaña es la partida. Si la cierra, la partida se queda guardada en su navegador y al volver a abrir el juego aparece **«Reanudar como anfitrión»**; los demás vuelven a entrar con el mismo código y su mismo nombre y recuperan su partido. Si un jugador se desconecta, el anfitrión puede pulsar **Forzar** para no quedarse esperando.

### Probar en un solo ordenador

En la portada, elige **«Pestañas de este navegador»**: puedes abrir varias pestañas del mismo `index.html` y cada una será un jugador (útil para aprender las reglas o probar cambios). Añadiendo `?dev=1` a la dirección se puede empezar con un único jugador.

## Qué ha cambiado respecto a la versión 1

- **Sin bots**: todos los partidos son jugadores humanos.
- **Multijugador en línea con anfitrión** y fases simultáneas: todos actúan a la vez y se avanza cuando todos están listos.
- **3D**: el mapa (casillas de terreno con relieve, bosques, montañas, ciudades, fronteras, nubes), el hemiciclo (gradas, diputados con el color de su grupo, luces de voto que se encienden en ola y marcador) y el plató del debate (atriles con el logo de cada partido y retratos de los candidatos). La interfaz va en paneles laterales que dejan la escena en el centro. El mapa tiene modos de datos: gobiernos, voto, paro, renta, deuda y saldo cantonal, sanidad, educación, seguridad e identidad propia.
- **Identidad de partido**: 24 colores (no se pueden repetir colores casi iguales), logotipo con forma, símbolo, estilo y dos colores.
- **Candidatos con cara**: editor de retrato (piel, peinado, ojos, cejas, nariz, boca, barba, gafas, edad, ropa…). Aparecen en el plató, en la investidura, en el Gobierno y en la prensa.
- **Sin afiliados**: los fondos salen de la subvención pública (por escaños y votos), donaciones y campañas.
- **Economía clara**: pestaña *Hacienda* con ingresos, gastos, superávit o déficit, deuda con semáforo (60 % y 100 % del PIB), prima de riesgo, en qué se gasta cada euro, de dónde sale, evolución de los indicadores, comercio exterior y presupuestos de cada cantón. Pestaña *Mundo* con los demás países (gobierno, crecimiento, paro, inflación, deuda, impuestos, aranceles y comercio contigo).
- **Turnos trimestrales**: el crecimiento se da en trimestral e interanual; la legislatura se mide en años y se convierte a trimestres.
- **La ideología se mueve con lo que votáis**: cada propuesta que presentáis o votáis deja un rastro en cada eje (economía, sociedad, territorio, mundo, medio ambiente). Un voto aislado apenas mueve nada; votar sistemáticamente contra vuestras posiciones acaba cambiando la etiqueta del partido, y la prensa lo cuenta como un «giro».
- **Prensa del trimestre**: tres periódicos con línea propia (El Faro, progresista; La Tribuna, conservador; Diario Pórtico, liberal y económico). Cada uno elige qué noticias da y cómo las titula, y publica además piezas propias sacadas de los datos (desigualdad, inseguridad, prima de riesgo, cuentas de los cantones…). Solo lo muy gordo (elecciones, investiduras, mociones de censura) sale en los tres.
- **Leyes en paquete**: una sola Ley Electoral con sistema, umbral, edad de voto, voto de residentes, voto obligatorio, duración de la legislatura y límite de mandatos; lo mismo con la Reforma Fiscal, los Presupuestos (solo el Gobierno), la Reforma Laboral, el Estatuto Territorial (orgánica), etc. En una sola propuesta se pueden cambiar varios apartados.

## Cambios de la versión 2.1

- Nombres de países y cantones generados con estilos muy distintos (nórdico, eslavo, celta, helénico…; y para los cantones, santos, accidentes geográficos, nombres vascos, catalanes, gallegos o inventados).
- En la formación de gobiernos cantonales solo ves tus propios apoyos y los procuradores de cada partido; lo que apoyan los demás se descubre en el recuento.
- Eje territorial dibujado de centralismo (izquierda) a confederalismo (derecha); el extremo «nacionalismo» pasa a llamarse centralismo. En medio ambiente el extremo es «ecologismo».
- Desplegables de leyes con contraste legible.
- Al redactar una ley, la dirección ideológica aparece en rojo (hacia la izquierda del eje) o azul (hacia la derecha).
- IRPF, sociedades, IVA, aranceles y el tramo cantonal del IRPF se fijan con precisión de centésimas (por ejemplo 31,25 %), con barra deslizante o escribiendo la cifra.

## Cambios de la versión 2.2: Estado, cantones e indicadores

- **Competencias en tres niveles.** Sanidad, educación, transporte, seguridad ciudadana y asuntos sociales pueden ser *del Estado*, *compartidas* o *de los cantones* (Estatuto Territorial, ley orgánica). Quien tiene la competencia tiene su propia partida de gasto; si es compartida, las tienen los dos y la calidad del servicio en cada cantón sale de la suma. Al transferir una materia, su dinero pasa automáticamente a las «Transferencias a los cantones» (y vuelve si se recentraliza).
- **Los cantones funcionan como un pequeño Estado.** Cada uno tiene presupuesto (partidas de sus competencias, promoción turística, ayudas al campo), sus propios impuestos, déficit o superávit, deuda e intereses. Sus ingresos son sus impuestos más las transferencias del Estado (repartidas por población y por la ley de solidaridad). Si un cantón quiere mejor educación pública, puede subir su IBI o crearse un IRPF cantonal para pagarla.
- **Ocho impuestos**, en el Estado y en cada cantón: IRPF progresivo, IRPF plano, impuesto sobre las nóminas, impuesto de sociedades, impuesto de sucesiones, IVA, IBI e impuesto sobre viviendas vacías. Un impuesto que no existe no aparece en el régimen fiscal hasta que alguien propone crearlo (desplegable «Crear un impuesto que hoy no existe»); los que existen se pueden cambiar con precisión de centésimas o suprimir.
- **Leyes sueltas**, fuera de cualquier paquete y sin existir al principio: subvenciones a los sindicatos, financiación de la ciencia y subvención a las energías renovables.
- **Partidas de gasto continuas**: los Presupuestos fijan cada partida en % del PIB con dos decimales y muestran cuánto dinero supone al año.
- **Ministerios nuevos**: Interior, Exteriores, Transporte (plan de obras), Economía (salario mínimo por decreto o plan para atraer inversiones), Hacienda (Presupuestos y mover hasta 0,5 puntos entre partidas), Sanidad, Educación y Asuntos Sociales (plan contra la pobreza). Los planes cuestan dinero y no se pueden lanzar si la materia está transferida por completo.
- **Indicadores siempre visibles**: bajo la barra superior, PIB, PIB por habitante, crecimiento, paro, inflación, inversión extranjera, ingresos y gasto públicos, superávit o déficit, deuda, prima de riesgo con calificación crediticia (AAA…CCC), interés de la deuda, población, inmigración, emigración, delincuencia e IDH, con una flecha verde o roja según mejoren o empeoren respecto a hace un año. Al pulsar la barra se abre una ventana con el gráfico de líneas de cada indicador (y algunos más: esperanza de vida, desigualdad, satisfacción, calidad de los servicios, emisiones y balanza comercial).

## Parties update 0.0.1

- **Seis ejes ideológicos** (se dibujan de izquierda a derecha):
  - Economía: socialismo · socialdemocracia · socioliberalismo · liberalismo · neoliberalismo
  - Sociedad: posmodernismo · progresismo · moderación · conservadurismo · tradicionalismo
  - Territorio: centralismo · unitarismo · autonomismo · federalismo · confederalismo
  - Mundo: globalismo · internacionalismo · pragmatismo · nacionalismo · soberanismo
  - Autoridad (nuevo): radicalismo · garantismo · legalismo · autoritarismo · totalitarismo
  - Medio ambiente: ecologismo · ambientalismo · sostenibilidad · desarrollismo · productivismo

  El debate tiene un bloque nuevo de autoridad y libertades; la ciudadanía tiene su propia posición en ese eje (militares y policías hacia el orden, artistas y estudiantes hacia las libertades), y leyes como el código penal, la independencia judicial, la televisión pública o el gasto en seguridad mueven a los partidos en él.
- **Partidos regionalistas.** Con al menos 3 partidos, durante el debate inicial cualquiera puede declararse regionalista de un cantón con más del 40 % de identidad propia (panel «Ámbito de tu candidatura»). Solo se presenta en ese cantón, tanto en las generales como en las cantonales, y allí recibe el voto identitario. Puede haber varios, del mismo cantón o de cantones distintos, siempre que queden al menos 2 partidos de ámbito nacional. Al cerrarse el debate su ideología territorial se inclina hacia el autogobierno y sus misiones de escala nacional (gran grupo, primera fuerza, gobernar media docena de cantones) se cambian por otras propias: gobernar su cantón, mayoría absoluta en casa, partido bisagra o más autogobierno. Se reconocen por un alfiler junto a su nombre.
- **Logotipos nuevos.** Tres estilos (lleno, invertido y partido en dos), 12 formas (círculo, cuadrado redondeado, cuadrado, escudo, hexágono, octógono, rombo, banderín, arco, anillo, sol y corona de laurel) y 76 símbolos: 29 dibujados a propósito (rosa, puño, paloma, antorcha, laurel, olivo, espigas, sol naciente, estrellas, corona de estrellas, hemiciclo, columna, cruz, flecha, llama, corazón, anillos, árbol, montañas, girasol, flor, trisquel, faro, puente, franjas, aves en vuelo…), la opción de usar las **siglas** del partido como logotipo y 47 iconos escogidos por su sentido político. Fuera cerebros, tiendas de campaña y similares.

## Interfaz 2.4

- **Barras de impuestos y gastos en vivo**: al arrastrar, la cifra cambia al momento. Debajo de cada apartado se ve cuánto recauda (o cuesta) ahora y cuánto recaudaría (o costaría) con el cambio, y al pie de la ley el efecto total en el saldo del Estado o del cantón. Es un cálculo estático: no incluye cómo reaccionará después la economía.
- **Propuestas secretas**: durante el trimestre cada partido solo ve las suyas (dentro de «Proponer una ley», donde se pueden retirar). Las de los demás se descubren en el pleno.
- **Panel derecho = inspector**: muestra el país, un cantón o un país extranjero, con pestañas *Resumen*, *Presupuesto* (cantones) y *Evolución* (gráficos de líneas; en los cantones, comparados con la media del país). Se abre tocando el mapa o con el selector de arriba del panel.
- **Elecciones por circunscripción**: la noche electoral tiene una pestaña con el voto y los escaños de cada circunscripción (y, con sistema mayoritario, quién ganó cada distrito).
- **Menos ruido**: la barra superior muestra solo los indicadores principales (el resto en «Gráficos»); la pestaña Mundo desaparece porque los países se ven en el inspector; en Hacienda, la estructura productiva, el comercio exterior y los presupuestos cantonales van plegados.

## Mundo 2.5: geografía y política extranjera

- El mapa tiene un continente principal, a veces un segundo continente al otro lado del mar, y varias islas.
- Los países extranjeros (de 4 a 7) son de tamaños muy distintos: vecinos de frontera, países de otro continente o países isla. Unos tienen cantones (algunos de ellos insulares) y otros son estados unitarios. Vuestro país también puede tener un cantón isla (Islas…, Archipiélago de…).
- El territorio extranjero se ve claramente: banda del color de cada país en sus fronteras y costas (dorada en el vuestro), nombre del país con su bandera y nombres de sus cantones.
- Cada país extranjero tiene sus propios partidos, manejados por el juego, con parlamento, gobierno (a veces en coalición) y elecciones periódicas o anticipadas. Los cantones extranjeros eligen su propio gobierno y, si tienen mucha identidad, su propio partido regionalista.
- Esos partidos defienden su ideología: se mueven un poco cada trimestre por azar, pero siempre vuelven hacia sus principios. Desde el gobierno ajustan el impuesto de sociedades y los aranceles según su ideología, lo que cambia el crecimiento y el comercio. Un gobierno soberanista puede romper el tratado con vosotros, y la simpatía hacia vuestro presidente depende de la afinidad ideológica.
- En el modo de mapa «Gobiernos», los países y cantones extranjeros aparecen con el color del partido que los gobierna. Al tocar un país extranjero, la pestaña «Política» del panel derecho muestra su gobierno, su parlamento y quién manda en cada cantón.

## Mapa 2.6: vistas, terreno y aguas

- **Tres vistas según lo cerca que esté la cámara** (también con los botones «Vista» de abajo):
  - **Países** (cámara lejos): solo se ven los nombres de los países, y cada país lleva una banda de su color por dentro de sus fronteras y costas. Es la única vista en la que se puede tocar un país para ver sus datos.
  - **Cantones** (media distancia): los nombres de los países se apagan y destacan los cantones y sus fronteras; las fronteras entre países se siguen viendo. Es la única vista en la que se puede tocar un cantón.
  - **Terreno** (muy cerca): cada casilla del mapa es un terreno. Al tocarla, el panel muestra su tipo como título (por ejemplo, «Hierba»), su relieve, lo que contiene, de quién es y a qué aporta en la economía. Aparecen también los nombres de los pueblos.
- **Tipos de terreno**: hierba (tierra fértil), arena, roca, asfalto o mar. El relieve (llanura, colinas o montaña) se ve en la altura.
- **Contenido**: bosques, ríos (nacen en zonas altas y bajan al mar), campos de cultivo, pueblos, ciudades, fábricas, puertos, minas y bancos de pesca. Todo ello alimenta la economía de cada cantón.
- **El mar es limitado**: solo existe hasta 3 terrenos de la costa. Ninguna isla queda suelta: si hace falta, un canal de mar abierto la une con el resto del mapa.
- **Aguas territoriales**: un terreno de mar es del país más cercano si está a 2 terrenos o menos de su costa. Si está igual de cerca de dos países, queda en disputa (se ve igual que el resto del mar; el panel y la etiqueta al pasar el ratón lo indican). Las fronteras marítimas se dibujan con una línea discontinua del color de cada país.
- **En el relieve, el color depende solo del terreno**: un prado es igual en todos los países. Para ver los países coloreados está el modo de mapa «Países» (mapa político).
- **Panel derecho**: lleva como título el nombre de lo que has tocado (país, cantón o tipo de terreno), sin selector; la cruz vuelve a los datos de tu país.
- **Eje ideológico**: en la pestaña «Partidos», en lugar de la brújula de dos ejes, cada partido aparece en un eje general que es la media de su posición en los seis ejes, tal como se dibujan. Un partido socialdemócrata y garantista pero conservador y federalista queda, de media, en el centro.

## Debate inaugural más corto

- Cada partido interviene una vez por bloque (antes, dos): el debate dura la mitad. Con 3 jugadores son 18 turnos; con 7, 42.
- El anfitrión tiene un botón «Saltar debate» abajo: reparte al azar las respuestas que faltaban (las ya dadas se mantienen) y pasa directamente al mapa ideológico.

## Saldo inicial de los presupuestos

- Al empezar la partida, el Estado y cada cantón arrancan con un saldo verosímil: lo normal es un déficit o un superávit pequeño (déficit el 51 % de las veces) y solo de vez en cuando uno grande (en el Estado, más del 2,5 % del PIB; en los cantones, más del 1,2 % de su PIB).
- Para conseguirlo, al crear el mundo se retocan los tipos de los impuestos y las partidas de gasto que salen al azar, mitad por cada lado. Como lo que cambia son las propias leyes, el saldo no salta de golpe en los trimestres siguientes; a partir de ahí evoluciona con la economía y con lo que aprobéis.

## Habitantes y edificios (primer paso del nuevo sistema económico)

- **Cada habitante vive en una vivienda.** Los pueblos tienen casas (de 6 a 16), y en cada casa vive una familia o nadie. Las ciudades tienen bloques de pisos con varias plantas, y en cada piso vive un hogar. En una vivienda nunca viven más de 7 personas (6 en un piso).
- **Hogares variados**: personas que viven solas, parejas, familias con hijos, familias monoparentales, tres generaciones bajo el mismo techo y pisos compartidos. Algunas familias vienen de otros cantones o de otros países.
- **Los habitantes son las personas que simula el juego**, una a una. Por eso ahora hay muchos menos habitantes: unos 2.000-3.000 por país, en lugar de millones. El PIB, los presupuestos y los saldos se muestran en la unidad que mejor se lee (M€ o k€), y la renta por habitante sigue siendo realista. La subvención a los partidos depende ahora de su porcentaje de voto.
- **Panel del terreno con tres pestañas**:
  - *Resumen*: tipo de terreno, nombre del pueblo o la ciudad, habitantes, viviendas, a quién pertenece y a qué aporta.
  - *Recursos naturales*: cultivos, bosques, ríos, minas, pesca y el tipo de suelo.
  - *Edificios*: las casas o los bloques. Al tocar una casa se ven sus residentes; al tocar un bloque, sus pisos, y al tocar un piso, quién vive en él. De cada persona: nombre, sexo, edad, profesión (o si está en paro), origen e ingresos al mes. De los niños: edad y etapa escolar.
- **La población cambia vivienda a vivienda**: nacen niños en los hogares; a los 16 años entran en la vida activa como estudiantes; los jóvenes con trabajo se independizan si encuentran un piso libre; los inmigrantes necesitan una vivienda vacía para llegar; si un hogar se queda sin adultos, sus niños se van con otra familia del cantón (o con quien emigra).
- (Desde la versión 0.0.3 las viviendas se compran y las constructoras levantan otras nuevas: ver más abajo.)
- En el mapa, cada pueblo dibuja exactamente sus casas y cada ciudad sus bloques, con su altura real.

## Buildings update 0.0.2: empresas, mercados y estadísticas

- **Toda la economía sale de las empresas.** Cada empresa está en un terreno del mapa (puede haber varias en el mismo, y también empresas en pueblos con casas) y se ve en el 3D: granjas con silo, ganaderías, pesqueras, explotaciones forestales, carpinterías, fábricas textiles, clínicas y colegios.
- **Sectores** (los demás han desaparecido):
  - Extracción: **agricultura** (grano o algodón), **ganadería** (carne y lana; consume grano), **pesca** (pescado) y **silvicultura** (madera).
  - Industria: **muebles** (consumen madera) y **textil** (ropa; consume tejido).
  - Servicios: **sanidad** y **educación**, públicas o privadas. La policía trabaja ahora en comisarías y cuarteles (ver «Economic update»).
- **Profesiones**: agricultor, ganadero, pescador, operario, empresario, profesional sanitario, académico y agente de la ley; además, en paro, estudiantes y jubilados.
- **Cómo funciona una empresa**: produce según su plantilla y el lugar (los campos con cultivos y río rinden más; la pesca depende de los bancos cercanos; la protección de la naturaleza limita la tala y la pesca), compra sus materias primas, vende, paga sueldos y cotizaciones, impuestos sobre el beneficio y el impuesto al carbono. Contrata cuando un trabajador más le sale a cuenta y despide cuando no; si se queda sin dinero, cierra. Donde hay gente en paro y negocio, se abren empresas nuevas (su dueño pasa a ser empresario). Si en un cantón no hay nadie en paro, algunas empresas contratan a gente que va a diario desde otro.
- **Mercado con precios**: los hogares compran grano, carne, pescado, ropa y muebles; las empresas, sus materias primas. Lo que sobra se exporta (al precio mundial, menos costes y represalias por los aranceles) y lo que falta se importa (más caro, con aranceles). Los precios del país se mueven entre esos dos límites y siguen a los mundiales. Los tratados comerciales abaratan el comercio.
- **Servicios públicos**: los hospitales, centros de salud, colegios y universidades públicos contratan personal según el presupuesto de su gobierno (Estado o cantón, según la competencia), hasta llenar sus plazas. **Los abren y los cierran los jugadores**: el ministro de Sanidad o de Educación (si la competencia es del Estado) o el presidente de un cantón (si es cantonal o compartida), desde «Acciones → Hospitales y escuelas públicos». Abrir cuesta la obra; cerrar manda a la plantilla al paro. Al empezar ya hay centros acordes con el gasto de la ley. Las clínicas y colegios privados viven de las familias con más renta, sobre todo donde la red pública no llega.
- **La sanidad, la educación y la seguridad** de cada cantón dependen ahora del personal que de verdad atiende allí (sanitarios por cada mil habitantes, docentes por cada cien alumnos y agentes por cada mil habitantes).
- **Leyes ajustadas**: las ayudas al campo son subvenciones a las explotaciones del cantón; la promoción turística desaparece; el modelo energético, el impuesto al carbono y las renovables cambian los costes de las fábricas y las emisiones; los aranceles encarecen lo importado y castigan lo exportado; la ley laboral decide lo rápido que se contrata y se despide; el salario mínimo pone un suelo a los sueldos.
- **Estadísticas**: el resumen de un terreno habitado y la nueva pestaña «Estadísticas» de cada cantón y del país muestran, en apartados desplegables, la pirámide de población por edad y sexo, las profesiones, dónde trabaja la gente, el salario mediano, los ingresos y el origen y los estudios de la población.

## Buildings update 0.0.3: bancos, constructoras y vivienda

- **Sin petróleo** (de momento): desaparece del mapa, de los recursos y de las exportaciones.
- **Bancos** (empresa nueva; trabajan **administrativos**, profesión nueva). Cada habitante tiene sus **ahorros** depositados en un banco de su cantón, que le paga intereses. Con esos depósitos y su propio capital, los bancos prestan: **hipotecas** a quien compra una vivienda y **préstamos** a empresas (para fundarse, para aguantar un mal trimestre o, a las promotoras, para levantar viviendas). Ganan con la diferencia de intereses y las comisiones. Si pierden demasiado (empresas que cierran sin pagar, desahucios por debajo de lo que se debía), **quiebran**: otro banco se queda con sus clientes y el Estado devuelve los ahorros garantizados.
- **Tipos de interés**: el banco central fija el tipo oficial (sube con la inflación); de él salen el interés de las hipotecas, de los préstamos a empresas, de los depósitos y la base de lo que paga el Estado por su deuda (la prima de riesgo es lo que paga por encima).
- **Comprar una vivienda** (no hay alquiler): los jóvenes que trabajan y viven con sus padres intentan independizarse comprando una vivienda vacía de su cantón, cerca de su trabajo. Pagan al contado o con hipoteca: hace falta la entrada (con la ayuda de la familia) y que la cuota no se coma demasiado del sueldo. Los inmigrantes solo llegan si encuentran una vivienda que puedan comprar. Quien no llega a pagar la hipoteca acumula impagos y puede acabar desahuciado (se va con familiares o deja el país).
- **Precio de la vivienda**: sube cuando escasean las viviendas vacías y baja cuando sobran; además sigue a los sueldos y depende del sitio (más caro en el centro de las ciudades). Las viviendas nuevas que no se venden se van rebajando.
- **Constructoras** (empresa nueva; trabajan **operarios**): levantan **promociones de viviendas** donde más demanda hay (casas en los pueblos, bloques en las ciudades), con un préstamo promotor y solo si salen a cuenta; construyen el **edificio de cada empresa nueva** donde su dueño decide fundarla; los **hospitales y escuelas públicos** que abre un gobierno (ya no aparecen al instante: se ven en obras); y hacen **obra pública** (parte del gasto en transporte) y **reformas**. Las obras se ven en el mapa (estructuras a medio levantar y grúas) y en la pestaña «Edificios».
- **Fundar una empresa**: alguien con ahorros (y nivel suficiente) funda una empresa si cree que será rentable; pone al menos el 20 % y el banco presta el resto si el negocio promete.
- **Límite de edificios por terreno**: cada terreno tiene **parcelas** (más en las ciudades, menos en la montaña). Una casa ocupa 1, un bloque 3, una fábrica 2 o 3, un hospital 4… Cuando un terreno se llena ya no se construye más ahí. El resumen del terreno muestra las parcelas ocupadas y el precio de la vivienda.
- **Leyes nuevas**:
  - *Ley de Vivienda*: concesión de hipotecas (cuánto se puede pedir, qué parte del sueldo puede ser la cuota y a cuántos años), ley del suelo (parcelas por terreno, altura de los bloques y urbanizar junto a pueblos y ciudades), ayudas a la compra (aval para menores de 36 años o cheque del 10 % que paga el Estado) y desahucios (rápidos, con garantías o con moratoria para familias vulnerables).
  - *Ley de Banca*: requisitos de capital de los bancos, garantía de depósitos y banco central (independiente o sometido al Gobierno: tipos más bajos y más inflación).
  - El IBI y el impuesto sobre viviendas vacías se calculan ahora sobre el valor real de las viviendas.
- **Estadísticas**: los habitantes muestran sus ahorros y su hipoteca; las estadísticas de terreno, cantón y país tienen «Ahorro e hipotecas» y «Vivienda y banca»; hay un modo de mapa «Precio de la vivienda» y gráficos del precio de la vivienda, del tipo oficial y de las viviendas terminadas.

## Economic update: nuevos sectores, necesidades y mercados por cantón

- **Nuevas empresas extractoras**: **canteras** (piedra; en montañas, colinas o terreno rocoso), **minas de metal** y **minas de carbón** (donde hay yacimientos; el mapa tiene ahora más relieve y más yacimientos). La piedra y la madera son lo que gastan las constructoras.
- **Nuevas industrias**: **máquinas** y **armas** (gastan metal; trabajan operarios e **ingenieros**, profesión nueva). Las máquinas las usan las centrales eléctricas; las armas, las comisarías y los cuarteles (y los hogares si la ley lo permite).
- **Nuevos servicios**: **electricidad** (centrales que gastan carbón y máquinas; cuánto de cada uno depende del modelo energético de la ley), **telecomunicaciones** (gastan electricidad y dan conexión a internet) y **medios de comunicación** (gastan electricidad y conexión; trabajan **periodistas**, profesión nueva).
  - Las fábricas que compran electricidad producen un 25 % más; los bancos, las clínicas y los colegios privados que compran conexión, un 15 % más (solo la compran si les sale a cuenta).
- **Seguridad**: las **comisarías** (del Estado o del cantón, según la competencia) y los **cuarteles** (del Estado, con el gasto en defensa) son edificios públicos, como los hospitales. Allí trabajan los agentes de la ley. Gastan armas: si no se pueden comprar (o son muy caras), los agentes rinden menos. Los abren y cierran el ministro de Interior (comisarías del Estado), el gobierno de cada cantón (las suyas) y la presidencia (cuarteles).
- **Ley de tenencia de armas** (en la Ley de Seguridad y Defensa): prohibida, con licencia o libre. Si se permite, los hogares compran armas como ocio y sube algo la delincuencia.
- **Necesidades (al estilo de Victoria 3)**: cada hogar tiene un **nivel de vida** del 1 (miseria) al 10 (muy rico) según sus ingresos por adulto. Cada nivel pide sus necesidades: alimentación básica, ropa sencilla, energía del hogar, enseres, comida de calidad, ropa de calidad, muebles y hogar, comunicaciones y ocio. Cada necesidad se cubre con varios bienes según lo que haya y lo que cueste: los hogares pobres se arreglan con tejido en lugar de ropa o con madera para calentarse; los ricos quieren carne, muebles, internet y entretenimiento. Si un hogar no llega a cubrir sus necesidades, su nivel de vida baja (y su satisfacción también). Lo que compran los hogares es la demanda de cada mercado.
- **Precios por cantón**: cada cantón (nuestro o extranjero) tiene su propio precio de cada producto. Llevarlo al cantón vecino cuesta (más cuanto más abulta: la piedra, el carbón o la madera viajan mal; la ropa o el entretenimiento, bien), así que lo que se produce en un cantón está más barato allí. Entre países se pagan, además, los aranceles. El «resto del mundo» compra y vende por los puertos y la costa al precio internacional (la electricidad y la conexión a internet no se pueden traer por mar).
- **Todos los países tienen cantones**: los que no los tenían tienen uno solo, sin competencias ni elecciones propias, que sirve para su mercado. Los cantones extranjeros producen y consumen según su terreno, su población y su desarrollo, y responden a los precios (aún no tienen empresas ni habitantes simulados uno a uno).
- **Aranceles por producto**: en la Ley de Comercio Exterior, además del arancel general a la importación, se puede poner un arancel distinto a la importación de cada producto y un arancel a la exportación.
- **Tratados**: completos (libre comercio en todo) o parciales (se eligen los productos que quedan libres de aranceles con ese país).
- **Dónde verlo**: Hacienda → «Mercados y comercio exterior» (precio medio de cada producto, diferencia con el precio internacional, precios en los cantones, producción, consumo, saldo y aranceles) y «Con quién comerciamos»; la nueva pestaña «Mercado» de cada cantón (sus precios frente a la media del país); en las estadísticas, «Nivel de vida y necesidades»; y en cada vivienda, el nivel de vida del hogar.

## Regionalists update: culturas, fervor y partidos regionalistas

- **Culturas**: cada cantón pertenece a una cultura. La mayoritaria es la del país; las minoritarias son grupos de uno a tres cantones vecinos con lengua y tradiciones propias (si son varios, la cultura tiene su propio nombre de «nación»).
- **Fervor cantonalista y fervor centralista** (sustituyen a la «identidad propia»): en cada cantón, una parte de la gente es cantonalista, otra centralista y el resto neutral (por ejemplo, 30 % / 40 % / 30 %). Los cantonalistas tiran hacia los partidos descentralizadores y regionalistas; los centralistas, al revés; los neutrales no se mueven por el eje territorial.
  - Los que llegan de otros cantones o del extranjero se sienten menos del cantón: cuantos más hay, menos fervor cantonalista (la inmersión lingüística hace que se integren antes). Los hijos nacidos allí ya son nativos.
  - **Lo mueven las leyes**: inmersión lingüística, lengua de la Administración, televisión pública cantonal, promoción de la cultura propia, delegaciones en el exterior, lenguas cooficiales, currículo escolar, símbolos oficiales, selecciones deportivas, consultas de autodeterminación, concierto económico, competencias transferidas y quién gobierna. Subirlo cuesta más cuanto más alto está (pasar del 40 al 50 % es más fácil que del 50 al 60 %). Si nada cambia, vuelve poco a poco a su nivel de siempre.
  - Dónde verlo: sección «Identidad» de cada cantón (barra cantonalistas / neutrales / centralistas, tendencia y, en el botón de información, qué lo está moviendo), modos de mapa «Fervor cantonalista» y «Fervor centralista», y gráficos de evolución del país y de cada cantón.
- **Partidos regionalistas**: ya no se eligen en un panel aparte. En el debate inaugural aparecen **respuestas regionalistas** (moradas) para las culturas con algún cantón que empezó con al menos un **40 %** de fervor cantonalista. Elegir una convierte al partido en regionalista de esa tierra: solo se presenta (en generales y cantonales) en los cantones de esa cultura que empezaron por encima del 40 %, y allí los cantonalistas le dan un empujón moderado.
  - Como mucho **N − 2** partidos regionalistas (N = número de partidos). Puede haber varios de la misma tierra y de tierras distintas.
  - Cada partido solo puede dar una respuesta regionalista: el resto del debate responde como todos.
- **Debate inaugural con N + 1 respuestas**: cada pregunta tiene ahora 8 respuestas posibles y en cada partida se muestran tantas como partidos haya más una (siempre una de cada extremo del eje). Cada respuesta muestra en pequeño su efecto: hacia dónde empuja en cada eje y cuánto (uno, dos o tres puntos).
- **Cambiar el nombre de un cantón**: quien lo preside puede hacerlo desde «Acciones» → «Tus gobiernos cantonales» (una vez por trimestre).
- **Fusionar cantones**: quien preside un cantón puede proponer unirlo con un vecino (y darle nombre al nuevo). Si preside los dos, es inmediato; si no, el gobierno del otro cantón tiene que aceptarlo ese trimestre. El nuevo cantón suma territorio, gente, empresas, deuda y parlamentos (reescalados hasta las próximas cantonales) y se reparten de nuevo los escaños del Parlamento nacional.
- **Concierto económico** (nueva Ley de Financiación Cantonal, con la solidaridad entre cantones y el cálculo del cupo): los cantones elegidos se quedan con lo que el Estado recauda en ellos, dejan de recibir transferencias y pagan un cupo por los servicios comunes. Con un cupo favorable el cantón gana dinero (y el Estado lo pierde); equilibrado, algo; exigente, pierde un poco. Sube su fervor cantonalista, el de sus vecinos de cultura (que también lo quieren) y el centralista del resto del país.
- **Leyes nuevas**: consultas de autodeterminación (Estatuto Territorial), currículo escolar (Ley de Educación), Ley de Símbolos y Deporte (símbolos oficiales y selecciones cantonales) y, en la Ley de Lengua y Cultura de cada cantón, lengua de la Administración, televisión pública cantonal, promoción de la cultura propia y delegaciones en el exterior (estas tres cuestan dinero al cantón).
- **Ministerio de Educación y Cultura** (antes, de Educación).
- **Eje territorial por profesión**: los operarios tiran un poco al centralismo; agricultores y ganaderos, al cantonalismo; el resto de profesiones no tiene inclinación territorial.
- **Misiones nuevas** de identidad (para regionalistas y para centralistas) y de economía y bienestar.

## Fixes de esta versión

- **Agenda secreta**: muchas más misiones posibles. Ya no hay misiones de financiación del partido ni de corrupción. Una de cada cinco cartas es una **«agenda oscura»**: que algo vaya mal (que suba el paro, la deuda, la inflación, el déficit, la desigualdad o la delincuencia, que haya recesión, que caiga la satisfacción o que se dispare la vivienda).
- **Vivienda y banca** (estadísticas): el tipo oficial, el de las hipotecas, el de los préstamos a empresas y lo que rinden los depósitos se ven ahora como tarjetas, igual que el precio de los pisos o las viviendas vacías (con su evolución).
- **Nivel de vida y necesidades**: el texto explicativo está en un botón de información (pasa el ratón por encima o tócalo).
- **Redactor de leyes**: los párrafos de introducción de cada ley y las explicaciones de cada apartado también están en botones de información.

## Voto económico más justo

- El partido que gobierna ya no se lleva votos solo porque la gente esté contenta: el **voto económico se mide por cuánto ha cambiado la satisfacción de cada persona desde el inicio de la legislatura** (desde la investidura; en los cantones, desde que se forma su gobierno).
- Pesa menos y tiene **tope**: como mucho un empujón moderado si las cosas mejoran mucho, y un castigo algo mayor si empeoran (la gente castiga más de lo que premia). Los ministerios reciben la mitad.
- **Desgaste por gobernar**, muy ligero: cada trimestre en el poder resta un poquito, hasta un máximo pequeño. Si el mismo presidente repite, el desgaste sigue acumulándose.

## Minifix

- **Vistas del mapa**: «Fervor cantonalista» y «Fervor centralista» se unen en **«Fervor identitario»** (morado donde pesan más los cantonalistas, rojo donde pesan más los centralistas; la etiqueta muestra los dos porcentajes). «Deuda cantonal» y «Saldo cantonal» se unen en **«Cuentas cantonales»** (color según el saldo sobre el PIB del cantón; la etiqueta muestra saldo y deuda). Desaparece la vista «Voto».
- **Aborto y natalidad**: cuanto más fácil es abortar, menos nacimientos (+6 % si se prohíbe, −6 % con ley de plazos, frente a los supuestos).
- **Eutanasia con tres niveles** (prohibida, solo enfermos terminales, amplia): cuanto más libre, algo más de mortalidad entre mayores (hasta +10 % desde los 75 años con la ley amplia).
- **Encuestas por ámbito**: se puede encargar una encuesta de todo el país o de un solo cantón (más barata). Los partidos regionalistas solo pueden encuestar los cantones donde se presentan (toda su tierra o uno de sus cantones). Con un ámbito, los estudios por grupos y de leyes solo cuentan a la gente de esos cantones.
- **Voto económico y desgaste también en los cantones**: se miden desde que se forma cada gobierno cantonal, con el mismo tope y el mismo desgaste ligero.

## Eje territorial: centralismo a la izquierda, federalismo a la derecha

- Internamente el eje territorial va ahora de **−2 = centralismo (izquierda)** a **+2 = confederalismo (derecha)**, igual que se dibuja. Antes se guardaba al revés y se invertía al dibujarlo; el comportamiento del juego no cambia, pero todas las cifras (profesiones, leyes, debate, partidos extranjeros, periódicos, fervor) siguen ya esta convención.
- Las partidas guardadas de la versión anterior no sirven (versión 32).

## Economic upgrade: empresas por niveles, cesta y fiscalidad real

- **Empresas por niveles**: cada tipo de empresa tiene una plantilla máxima por nivel (por ejemplo, una explotación agrícola admite 4 trabajadores por nivel: 4 en el nivel 1, 8 en el 2, 12 en el 3). No hay nivel máximo.
  - **Producción fija por trabajador**: cada trabajador produce lo mismo (ya no hay rendimientos decrecientes). Cada nivel por encima del 1 suma un 1 % de productividad y un 1 % más de insumos (nivel 3: +2 %).
  - Con los precios de referencia, cada trabajador genera unos 40 k€ de valor añadido al año y cobra alrededor del 70 % de lo que aporta. Por trabajador y año: 200 t de grano (o 20 t de tejido), 8 t de carne y 4 t de tejido, 10 t de pescado, 500 m³ de madera, 800 t de piedra, 20 t de metal, 200 t de carbón, 200 muebles, 2.400 prendas, 3 máquinas, 50 armas, 1.000 MWh, 160 líneas de internet o 300 abonos de entretenimiento.
  - **Escalar**: el dueño amplía su empresa un nivel cuando está llena, gana dinero, hay gente para contratar y lo que ganaría con la nueva plantilla paga la obra en menos de tres años. Lo paga con su caja o con un préstamo. La ampliación la hace una constructora mientras la empresa sigue trabajando.
  - **Obras más rápidas**: los edificios de empresas y las ampliaciones son obras cortas y tienen prioridad en las constructoras (sin parar las viviendas que ya estén en marcha).
  - **Ayudas a la inversión empresarial** (nueva ley, en la Ley del Sector Público): el Estado paga el 15 % o el 30 % de la obra de fundar o ampliar una empresa. No obliga a nadie: a más empresarios les salen las cuentas.
- **Ganadería sin insumos**: produce carne y tejido sin gastar grano. Los ganaderos desaparecen como profesión: ahora son agricultores.
- **Rotación en el empleo**: cada trimestre algunos contratos terminan (más cuanto más flexible es la ley laboral) y encontrar trabajo cuesta más cuanto menos paro hay; así el paro se queda cerca del que marcan las leyes.
- **Cesta de los hogares**: cada hogar cobra su renta ya sin IRPF, paga la hipoteca y después compra la cesta de su nivel de vida, con el IVA incluido en los precios. Lo que sobra lo ahorra. Si no le llega, tira de ahorros; si tampoco, compra primero lo básico y su nivel de vida baja. La cesta de cada nivel cuesta entre el 98 % (los más pobres) y el 75 % (los más ricos) de sus ingresos.
- **Compras públicas**: la parte del gasto en sanidad, educación, seguridad y defensa que no son sueldos se gasta en bienes (electricidad, internet, máquinas, muebles, ropa, comida, armas…).
- **Impuestos coherentes**: todo lo que se recauda sale de lo que pasa de verdad.
  - IRPF plano: exactamente su tipo sobre cada renta. IRPF progresivo: el tipo de la ley es la media; quien gana más paga un porcentaje mayor y la recaudación total es ese tipo por las rentas. Ya no hay evasión inventada.
  - IVA: su tipo sobre lo que compran los hogares (si nadie comprara nada, no se recaudaría nada).
  - Nóminas: sobre los sueldos que pagan las empresas y la Administración. Sociedades: sobre los beneficios reales. Carbono: lo que pagan las empresas por sus emisiones. Sucesiones: sobre las herencias de quien fallece. IBI e impuesto sobre viviendas vacías: sobre su valor.
  - El IRPF progresivo de partida ronda ahora el 12-16 % (antes la cifra de la ley no era lo que se pagaba).

## Fixes de esta versión (2)

- **Pesos ideológicos**: pescadores y agentes de la ley, 0 en economía; empresarios y administrativos, 0 en sociedad.
- **Natalidad**: nacen 104 varones por cada 100 mujeres; las mujeres viven algo más (su riesgo de morir cada año es un 10 % menor y el de los hombres, un 7 % mayor).
- **Votación de leyes**: cada ley muestra hacia dónde movería tu ideología votar sí o votar no (un poco, bastante o mucho). Abstenerse no la mueve.
- **Participación**: los extranjeros nacionalizados votan bastante menos; los nacidos en el cantón, algo más que los llegados de otros cantones.
- **Ayudas al campo**: ya no van a las explotaciones forestales; solo a las agrícolas, ganaderas y pesqueras.
- Versión 33: las partidas guardadas de versiones anteriores no sirven.

## Mercado por órdenes: cantidades sencillas y precios por oferta y demanda

- **Todo por trimestre y en unidades (u)**. Lo que produce cada trabajador en un turno (nivel 1):

  | Empresa | Produce | Gasta |
  |---|---|---|
  | Agricultura | 20 u de grano (o 10 u de tejido) | — |
  | Ganadería | 7 u de carne y 1 u de tejido | — |
  | Pesca | 12 u de pescado | — |
  | Silvicultura | 20 u de madera | — |
  | Cantera | 20 u de piedra | — |
  | Mina de metal / de carbón | 5 u de metal / 20 u de carbón | — |
  | Muebles | 5 u de muebles | 10 u de madera |
  | Textil | 10 u de ropa | 5 u de tejido |
  | Maquinaria | 1 máquina | 5 u de metal |
  | Armamento | 4 u de armas | 5 u de metal |
  | Eléctrica | 40 u de electricidad | 10 u de carbón y 0,1 máquinas |
  | Telecomunicaciones | 20 u de conexión | 8 u de electricidad |
  | Medios | 20 u de entretenimiento | 2 u de electricidad y 2 de conexión |

  Precios de referencia: grano 400 €, tejido 800 €, carne 1.000 €, pescado 650 €, madera 400 €, piedra 400 €, metal 1.600 €, carbón 400 €, muebles 2.400 €, ropa 1.200 €, máquina 16.000 €, armas 4.000 €, electricidad 350 €, conexión 550 €, entretenimiento 500 €. Así cada trabajador genera unos 8.000 € de valor por trimestre.
- **Cesta por unidades**: cada nivel de vida pide unas unidades de cada necesidad por adulto y trimestre (los menores cuentan medio). En **alimentos básicos** el estándar es el grano (1 u); el pescado cubre 1,5 u y la carne 2 u. En **alimentos de lujo** solo vale la carne (1 u). Un hogar de nivel 3 pide 6 u de alimentos básicos; los niveles altos comen cada vez más de lujo y el nivel 10 ya solo come de lujo. Cada hogar compra sobre todo lo que le sale más barato por unidad cubierta y cambia de costumbres poco a poco. Necesidades: alimentos básicos, alimentos de lujo, calefacción (madera o carbón), ropa, electricidad, muebles, conexión y ocio. La tabla de cada nivel se ve en las estadísticas de nivel de vida.
- **Órdenes de compra y de venta**: cada trimestre las empresas ponen a la venta todo lo que producen y hogares, empresas (materias primas) y Administraciones (compras públicas) piden lo que necesitan en su cantón. Los mercados se reparten producto a producto, primero las materias primas, así una fábrica produce menos si no consigue lo que necesita.
- **Precio**: cada producto tiene un precio en origen que se ajusta al final del turno con P siguiente = P · e^(0,2 · (compras − ventas) / ventas). Si fuera está más barato, los importadores empujan el precio hacia abajo; si fuera pagan más, los exportadores lo empujan hacia arriba. Los precios suelen moverse un par de puntos por trimestre.
- **Transporte**: lo que se compra en el cantón donde se produce se paga a precio de origen; lo que hay que traer de otro cantón paga además un pequeño porcentaje por cada paso (entre el 1 % del entretenimiento y el 9 % de la piedra). Por eso un producto es más barato donde se produce y más caro donde escasea. Lo que viene de otro país paga además los aranceles.
- **Lo que no se vende**: lo que sobra se vende a otros países que lo necesiten; lo que nadie compra (por ejemplo, la electricidad sin vecinos por tierra a los que venderla) se pierde y la empresa no lo cobra.
- **Empresas en apuros**: cobran solo lo que venden. Si les sobra producto o cada trabajador cuesta más de lo que aporta, despiden poco a poco. El banco deja de prestar a quien lleva tres trimestres perdiendo dinero. Una empresa **quiebra** si no puede pagar las nóminas, y **cierra** si lleva un año de pérdidas y su dueño no ve que el negocio vaya a mejorar. Al cerrar, su edificio desaparece del mapa, la plantilla va al paro, lo que quede en caja paga la deuda (el resto, para el dueño) y el banco pierde lo que no recupera.
- **Fundar y ampliar**: un empresario funda o amplía si prevé ganar dinero con los precios hacia los que va el mercado, si vende todo lo que produce y si queda hueco en ese mercado (no entran todos a la vez). Las explotaciones agrícolas cambian de grano a tejido (o al revés) si el otro cultivo rinde bastante más.
- **PIB coherente**: es la suma de lo que crean las empresas (lo que venden menos lo que compran) y los sueldos públicos, y cuadra con el gasto: compras de los hogares, servicios, compras y sueldos públicos, obras y exportaciones menos importaciones. Desaparecen los «otros gastos» inventados de las empresas.
- **El dinero da la vuelta**: la administración, la cultura, la ciencia y las energías limpias se gastan en compras públicas; parte del gasto en asuntos sociales llega en dinero a los hogares más pobres. Los hogares pagan además las comisiones del banco, las reformas de sus casas y las clínicas y colegios privados.
- **Inflación real**: el IPC es lo que cuesta de verdad la cesta de partida (con el IVA) y la inflación, lo que sube en un año. Los precios de fuera suben poco a poco (más si el Estado vive del déficit o el banco central depende del Gobierno).
- **Partida de inicio**: las empresas se reparten según lo que pide la población, las compras públicas y las fábricas, en los sitios donde caben.
- Versión 34: las partidas guardadas de versiones anteriores no sirven.

## Global update: un mundo de países simulados

- **Todos los países se simulan como el nuestro**: cada país extranjero tiene sus cantones, su gente (con nombres de su cultura), sus hogares, sus empresas, sus bancos, sus presupuestos y sus mismas leyes (las mismas que las nuestras). Todo se calcula a la vez cada trimestre: la producción, el paro, los precios, la vivienda, la migración…
- **Un único mercado mundial**: ya no hay «resto del mundo». Cada cantón de cada país vende primero en casa y lo que sobra lo compran los que lo necesitan donde salga más barato (con el transporte y los aranceles de cada país; los tratados de libre comercio los quitan). Cada país tiene su propio precio en origen, que se acerca al de los demás cuando comercian. La electricidad y la conexión a internet solo viajan por tierra. El mapa siempre tiene algo de carbón y de minas, pero no en todos los países: quien no tiene, importa.
- **Sus partidos legislan**: en cada país gobierna el partido más votado (con sus socios si no tiene mayoría) y cada trimestre presenta leyes según su ideología; los partidos más extremos piden cambios más grandes (salvo en impuestos y gasto, que se tocan de un paso en uno). Si sus cuentas van mal, primero las arreglan: la izquierda subiendo impuestos y la derecha recortando gasto. Las leyes se votan en su Parlamento y cambian su economía y su sociedad.
- **Sus elecciones**: cada país vota en su propio calendario, según la duración de sus legislaturas. Su gente vota igual que la nuestra (ideología y voto económico), así que un Gobierno que hunde la economía pierde.
- **Prensa internacional**: algunas decisiones de otros parlamentos (aranceles, impuestos, inmigración, energía…) y sus elecciones salen en las noticias.
- **Tratados**: un tratado de libre comercio necesita que lo aprueben los dos países. Si otro país nos propone uno, llega al Pleno como propuesta suya y entra en vigor solo si lo aprobamos. Cuando lo proponemos nosotros, el otro Gobierno decide según su ideología.
- **Inspector de un país extranjero**: resumen (población, PIB, renta por habitante, paro, inflación, deuda, saldo, qué produce y lo que comerciamos), **Política** (Gobierno, hemiciclo de su Parlamento, brújula política con los 6 ejes de todos sus partidos —toca un partido para ver su ideología eje por eje— y sus leyes recientes), **Cantones** y **Evolución**. En el mapa se ven sus empresas y sus casas; tocando una casilla se ven sus edificios y quién vive en ellos.
- **Culturas e inmigración**: cada país tiene una cultura (hispana, latina, helena, germánica, nórdica, celta, eslava, de la estepa o insular), más o menos parecida a las demás. En las fichas de las personas se ve la cultura de los inmigrantes. La gente emigra si no tiene trabajo o le va mal, hacia países con trabajo, buenos sueldos, cultura parecida, cerca y con la puerta abierta (ley de inmigración); también vuelve a su país. Muchos inmigrantes de culturas muy distintas y poco integrados elevan la delincuencia.
- **Gimnasios**: nueva empresa de servicios (solo se usa en su zona). Su servicio cubre la necesidad de ocio, como el entretenimiento. Gasta un poco de maquinaria, tiene como mucho nivel 2 y en el nivel 1 trabajan hasta 3 administrativos más el dueño.
- **Economía cerrada más estable**: al empezar, las plantillas se ajustan a lo que de verdad se pide en todo el mundo; los sueldos siguen a lo que aporta cada trabajador (si un trimestre se vende menos se ajusta la plantilla, no el sueldo de todos); las empresas que pierden dinero recortan antes de cerrar; con poco paro, las empresas que más rinden contratan gente de las que menos; los hogares gastan parte de los ahorros que les sobran (más cuanto más bajos están los tipos de interés) y no bajan de nivel de vida porque falte algo en las tiendas, solo si no les llega el dinero; el gasto público sigue al PIB de los últimos trimestres; las centrales cambian de mezcla energética poco a poco; las máquinas son desgaste del equipo (sin repuestos se produce algo menos, no nada).
- **Arreglos**: los tres primeros jugadores empiezan con el Partido Demócrata (rojo), el Partido Independiente (azul) y el Partido del Centro (verde), que pueden cambiar. El resumen del país muestra el hemiciclo nacional, los habitantes y la renta por habitante, y su lista de cantones ya no tiene la columna de saldo (sí habitantes, paro y renta). El resumen de un cantón muestra su PIB y qué parte es del PIB del país.
- Versión 35: las partidas guardadas de versiones anteriores no sirven.

## Food & Trade update: alimentación, comercio y política fiscal extranjera

- **Industria alimentaria** (nueva empresa): transforma grano, carne o pescado en **alimentos procesados**. Usa sobre todo el insumo que le sale más barato por trabajador y cambia de uno a otro poco a poco según los precios. Cada unidad de alimentos procesados alimenta más que cualquier otro alimento: cubre **3** unidades de «Alimentos básicos» (el grano 1, el pescado 1,5, la carne 2) y **2** de «Alimentos de lujo» (la carne 1).
- **Pequeño comercio** (nueva empresa): convierte alimentos procesados, ropa o conexión a internet (lo más barato de los tres) en **servicios**. Los servicios cuentan como ocio, igual que el entretenimiento y los gimnasios, pero cubren **2** unidades de ocio en lugar de 1. Llegan poco más allá de su cantón (cada salto encarece un 25 %) y no cruzan el mar. Cada tienda es pequeña: nivel 3 como máximo, hasta 3 administrativos por nivel más el dueño.
- **Responsabilidad fiscal (eje oculto)**: cada partido extranjero tiene un valor de −1 a 1 que no sale en ninguna brújula. Los muy responsables quieren que haya superávit: cuando hay déficit proponen recortes o subidas de impuestos, prefieren leyes baratas y votan contra las que cuestan dinero. Los poco responsables toleran el déficit y proponen gastar, bajar impuestos y apoyan las leyes caras. Se nota sobre todo en las cuentas del país cuando gobierna uno u otro.
- **Coaliciones por coherencia**: en los países extranjeros (y en sus cantones) ya no gobierna el partido más votado por serlo: entre todas las combinaciones que suman mayoría absoluta se elige la más coherente (partidos más parecidos entre sí, pocos socios y ninguno que sobre). Puede quedar en la oposición el partido que ganó las elecciones, y la prensa lo cuenta.
- **Hemiciclos**: en todos los hemiciclos, 2D y 3D, de cualquier país o cantón, los partidos se sientan de izquierda a derecha según su posición en el eje ideológico general; el más a la izquierda, a la izquierda.
- **Resumen**: el recuadro del superávit o del déficit muestra el porcentaje del PIB y debajo la cantidad exacta al año, del mismo color. Los habitantes muestran su evolución como el PIB. En los países extranjeros el resumen también tiene la evolución de habitantes, PIB, renta, paro, inflación, deuda y saldo.
- Versión 36: las partidas guardadas de versiones anteriores no sirven.

## Economic rework: trabajo, cualificaciones, socios, emprendimiento y nuevas necesidades

- **Mercado de trabajo por ofertas**: cada empresa calcula lo que le aporta un trabajador más (lo que produce y vende, menos los insumos). Si le sale a cuenta, publica ofertas: la primera, un 30 % por debajo de lo que se paga de media en el puesto (nunca por debajo del salario mínimo); si nadie la acepta, la sube cada trimestre mientras le siga saliendo a cuenta. Una oferta para un cualificado que nadie pide en dos trimestres se duplica en otra para alguien sin cualificar. Las empresas reponen a quien se va, salvo si están en crisis o les sobra producción.
- **Buscar trabajo**: quien está en paro (y, de vez en cuando, quien trabaja) mira 5 ofertas al azar y se apunta a las que le pagan más de lo que gana ahora (o del subsidio) y para las que vale. Cada oferta se cubre con alguien al azar entre los que viven más cerca (en la misma casilla, el mismo cantón…). Quien lleva tiempo en paro busca también en los cantones vecinos (va a diario) y, después, en todo el país: entonces la familia se muda, vendiendo su vivienda al banco y comprando otra (si nadie más de la casa trabaja y si se la pueden permitir).
- **Sueldos de cada persona**: cada uno entra con el sueldo de su oferta y luego se acerca poco a poco a la parte habitual de lo que aporta (el 70 % del valor añadido, nunca más del 90 % descontadas sus cotizaciones). Nadie cobra más de lo que produce menos sus impuestos y sus insumos. Si la empresa pierde dinero, los sueldos bajan más deprisa (tanto más cuanto más flexible es la ley laboral).
- **Despidos**: si alguien cuesta más de lo que aporta, la empresa lo despide cuando un año de pérdidas pasaría de la indemnización que marca la ley laboral (que paga la empresa al despedido). Solo se plantea si la empresa pierde dinero o le sobra mucha producción.
- **Cualificaciones**: sin cualificar trabajan agricultores, pescadores, operarios, comerciantes, agentes de la ley y empresarios; cualificados son ingenieros, oficinistas (antes «administrativos»), académicos, sanitarios y periodistas. Cada empresa tiene un mínimo y un máximo de cualificados (por ejemplo, minas e industria pesada: ingenieros; bancos: todo oficinistas; clínicas: sanitarios). Por debajo del mínimo produce menos; cada cualificado de más (hasta el máximo) rinde un 30 % más. Quien tiene una cualificación trabaja de ella, de académico o en cualquier empleo sin cualificar (nunca de otra cualificación). Las cualificaciones no caducan.
- **Estudios**: de los 18 a los 25 años cada estudiante elige especializarse en la cualificación mejor pagada (4 trimestres) si alguna se paga mejor que los empleos sin cualificar; si no, se pone a trabajar. Los adultos en paro sin cualificar también pueden volver a estudiar. Las plazas dependen de los académicos que haya. Los inmigrantes llegan con la cualificación que tuvieran (muchos sin ninguna): les atraen los sueldos, el empleo y también el subsidio de paro y la renta básica.
- **Niveles y socios**: cada nivel suma un 3 % de productividad (y gasta un 3 % más de insumos); el máximo es el nivel 6 (los gimnasios, 2; los comercios, 3). Las empresas de nivel 1-2 son pequeñas y tienen un dueño; las de nivel 3-4, medianas, dos socios; las de nivel 5-6, grandes, tres. Para crecer a mediana o grande hace falta un socio con ahorros que ponga su parte. Los socios se reparten a partes iguales lo que se lleva la propiedad. Quien se jubila sigue siendo socio; si muere, hereda su parte alguien de su casa; si no hay nadie, los demás socios buscan otro (si en un año no lo encuentran, la empresa baja de nivel) y, si era el único dueño, la empresa se vende a quien tenga ahorros o cierra. Los empresarios y socios no emigran.
- **Emprender**: alguien con ahorros funda una empresa (siempre de nivel 1) si ve hueco en el mercado (contando lo que producirán las empresas que ya están en obras) y si lo que espera ganar supera su «vara»: lo que ganaría trabajando de lo suyo (algo más por el riesgo, más lo que le darían sus ahorros en el banco) y nunca menos que sus empleados. Quien lleva tiempo en paro se conforma con menos.
- **Crisis y cierre**: si dos trimestres seguidos el dueño no alcanza su vara (lo que ganaría trabajando, y no menos que el 70 % de su plantilla) o la empresa pierde dinero, entra en crisis: baja sueldos (lo que permita la ley), despide a quien no le sale a cuenta y no repone bajas. Cierra por su cuenta solo si ni pagando el sueldo mínimo le saldría a cuenta y si un año de pérdidas pasa de lo que le costaría despedir a todos (unas indemnizaciones altas la hacen aguantar). Quiebra si se queda sin caja y sin crédito: entonces los trabajadores no cobran indemnización.
- **Ficha completa de cada empresa** (botón «Ver ficha completa» en el edificio): tipo, nivel y tamaño, socios, caja, deuda, resultado; productividad (nivel, cualificados, mejoras, maquinaria, insumos que faltan…); lo que produce, vende y a qué precio; lo que compra y a qué precio; sus cuentas del año (ventas, insumos, sueldos, cotizaciones, intereses, beneficio, impuesto de sociedades y lo que se llevan los socios); su plantilla con el puesto y el sueldo de cada uno; y sus ofertas de empleo abiertas.
- **Maquinaria duradera**: el campo, la ganadería, la pesca, los bosques, las canteras y las minas pueden comprar máquinas. Cada máquina (hasta una por trabajador) da un 30 %/N más de producción, así que con una por trabajador se produce un 30 % más. Las máquinas se desgastan un 4 % al trimestre y solo se compran, de una en una, si salen a cuenta: la mecanización llega poco a poco (y sube el precio de las máquinas).
- **Nuevas necesidades** (como en la tabla propuesta): los niveles de vida van por ingresos netos al año por adulto (indigente, pasando penurias, pobre, tirando, seguro, próspero, abundante, rico, lujoso y opulento: cortes en 5.000, 10.000, 15.000, 20.000, 25.000, 30.000, 40.000, 50.000 y 60.000 €, en euros de partida). Alimentos básicos (hasta abundante), de lujo (desde seguro), ropa sencilla (hasta tirando) y ropa (desde pobre), enseres básicos (de pasando penurias a tirando) y artículos del hogar (desde pobre, más cuanto más rico), calefacción (tejido, madera, carbón o electricidad), ocio (desde seguro: conexión hasta el 30 %, entretenimiento, gimnasio y servicios) y salud (la cubren la sanidad pública y la privada; necesita más quien es mayor y quien vive mejor). Cada bien puede cubrir como mucho una parte de la necesidad (el grano, como mucho el 90 % de los alimentos básicos, por ejemplo). Las cantidades cambian poco a poco de un nivel a otro.
- **Estadísticas**: en «Trabajo y profesiones» se ven las ofertas sin cubrir, las contrataciones, los despidos y las cualificaciones (cuántos la tienen, trabajan de ella, están en paro o la estudian, y su sueldo medio). En las fichas de las personas se ve su cualificación y si se están especializando.
- **Centros públicos: plazas, sueldos, nacionalizar y privatizar** (en «Acciones» → «Centros públicos», para quien tenga la competencia: el ministerio de Sanidad o de Educación si es del Estado, o el presidente del cantón si está transferida):
  - **Plazas y sueldo** (gratis): en cada centro se puede fijar cuántas plazas saca y el sueldo bruto al mes de sus puestos cualificados (sanitarios o académicos; el personal sin cualificar cobra un 68 % de eso). Las ofertas salen con ese sueldo y se presenta quien gane más así (los cualificados que trabajan en la privada también). Si las plazas fijadas cuestan más de lo que da el presupuesto, la diferencia se paga como gasto extra. Dejarlo vacío vuelve a lo que diga el presupuesto y al sueldo público de referencia.
  - **Nacionalizar** (1 PC): se compra una clínica o un colegio privado con dinero público por lo que vale (sus edificios y su caja, más su deuda con el banco). Sus dueños se quedan el dinero y su plantilla pasa a ser personal público.
  - **Privatizar** (1 PC): el centro sale a subasta. Cada persona con ahorros calcula lo que ganaría llevándolo como centro privado (cobrando a quien no le llegue lo público) y solo puja si le sale a cuenta frente a lo que ganaría trabajando; puja lo que valen tres años de ese beneficio (como mucho, lo que tiene). Se lo queda quien más puja y el dinero va a las cuentas públicas. Si nadie lo ve rentable, la subasta queda desierta.
- Arreglo: abrir un centro público costaba cuatro veces su precio en la deuda; ahora cuesta lo que vale.
- Versión 37: las partidas guardadas de versiones anteriores no sirven.

## Centros públicos más claros y situación laboral

- **Panel de centros públicos rehecho** (en «Acciones» → «Centros públicos»): arriba eliges qué gestionas (cada materia de cada gobierno que tengas, en un desplegable si son muchas). Para cada una ves de un vistazo cuántos centros tienes, cuánto personal trabaja frente a las plazas que caben, a cuánta gente paga el presupuesto y una frase que te dice cómo va (si sobra dinero, si habrá despidos, si te pasas del presupuesto…). Cada centro aparece con su ocupación, su sueldo y sus plazas, y un botón «Gestionar».
- **Ficha de cada centro**: eliges «¿Cuántas plazas saca?» (las que pague el presupuesto o un número fijo, con una barra) y «¿Con qué sueldo?» (el de referencia o uno propio). Mientras lo mueves, ves lo que cobra cada puesto, cómo queda frente a lo que paga la empresa privada, el coste para el gobierno al mes y al año, y si cabe en el presupuesto o cuánto gasto extra supone. Privatizar y cerrar están dentro, aparte. Guardar es gratis.
- **Abrir y nacionalizar**: los tipos de centro se eligen con tarjetas (plazas, precio y dónde se pueden poner), y las clínicas o colegios privados que se pueden comprar aparecen con su precio. Los botones dicen lo que cuestan y se desactivan si ya has usado esa decisión este trimestre.
- **Más sueldo, menos plazas**: si un centro paga un sueldo propio y deja las plazas al presupuesto, el mismo dinero da para menos gente (o para más, si paga menos).
- Arreglo: en las comisarías y cuarteles (sin puestos cualificados) el sueldo fijado se aplicaba al 68 % a los agentes; ahora cobran el sueldo fijado.
- **Situación laboral**: además de por su profesión, cada persona se clasifica como jubilada, desempleada, del sector privado o funcionaria (y, mientras estudia, estudiante). Funcionario es quien trabaja en un centro público (sanidad, educación, comisarías y cuarteles), sea cual sea su profesión.
  - Los funcionarios tiran más a la izquierda (sobre todo en economía, y algo en lo social) y los del sector privado, más al liberalismo económico. Quien cambia de situación (entra en la Administración, pasa a la privada, se queda en paro o se jubila) va cambiando de ideas poco a poco. Al nacionalizar o privatizar un centro, su plantilla cambia de grupo.
  - Se ve en «Estadísticas» → «Situación laboral» (cuántos hay en cada grupo y dónde se sitúan en economía y en lo social), en las fichas de las personas («funcionaria», «sector privado»), en el voto por grupos de las encuestas sociológicas y como público de las campañas («Colectivo: Funcionarios» o «Sector privado»).
- Las propuestas: hasta 2 nacionales y 2 en **cada** cantón por trimestre.

## Empresas públicas

- **Cualquier empresa puede ser pública** (salvo los bancos y las constructoras; las clínicas y colegios públicos siguen siendo centros públicos). Una empresa pública produce, compra y vende como cualquier otra, pero es de un gobierno: no tiene dueños, no quiebra ni cierra sola, y su plantilla es funcionaria (sueldo público de referencia o el que fije su gobierno).
- **Quién las lleva**: las del Estado, quien tenga el Ministerio de Economía; las de cada cantón, su presidente (solo en su cantón). Se gestionan en «Acciones» → «Empresas públicas».
- **Lo que gana o pierde va a las cuentas de su gobierno**: si gana dinero, entra como «Beneficios de las empresas públicas»; si pierde, sale como «Pérdidas de las empresas públicas». No paga impuesto de sociedades. El panel muestra cuánto gana o pierde cada una y el total.
- **Precio**: para cada cosa que vende, su gobierno elige entre el precio de mercado o un precio fijado.
  - **Por debajo del mercado**: vende antes que nadie a los compradores de su cantón y, si le sobra, a los de los demás cantones (con el transporte); lo que aún le sobre lo vende fuera a precio de mercado. Los hogares y las empresas de la zona pagan menos y compran más, pero la empresa ingresa menos (lo paga su gobierno) y las privadas que hacen lo mismo venden menos: el precio de mercado puede subir para los demás.
  - **Por encima del mercado**: solo le compran quienes no encuentran el producto en el mercado; lo que no vende se pierde.
- **Plazas y sueldo** (gratis): todas sus plazas o un número fijo, y el sueldo de referencia o uno propio (como en los centros públicos). La ficha calcula al momento lo que ganaría o perdería la empresa con los cambios.
- **Crear** (1 PC): se elige el tipo y el sitio (donde quepa una empresa así); se paga la obra una vez y, cuando termina, contrata a su plantilla. Un gobierno puede crear una empresa por trimestre.
- **Nacionalizar** (1 PC): se compra una empresa privada por lo que vale (edificios y caja) más su deuda con el banco. Sus dueños se quedan el dinero; su plantilla pasa a ser funcionaria. Gusta a los funcionarios y disgusta a los empresarios.
- **Privatizar** (1 PC): subasta. Cada persona con ahorros calcula lo que ganaría llevándola a precios de mercado y con sueldos de mercado, y puja si le sale a cuenta (como mucho, tres años de ese beneficio y lo que tenga ahorrado). Si nadie puja, queda desierta. Lo que se cobra entra como privatización.
- **Ampliar** (1 PC más la obra) y **cerrar** (1 PC; la plantilla va al paro).
- **La ley del sector público** («Empresas públicas») ya no da ingresos ni deuda inventados: ahora pone el límite de empleo que pueden tener las empresas públicas de todos los gobiernos juntos: «Privatización total», ninguna (no se pueden crear ni nacionalizar); «Pocas», hasta el 5 %; «Modelo mixto», el 15 %; «Muchas», el 35 %; «Economía estatalizada», sin límite. Sigue asustando al capital si es muy alta.
- En el mapa, la ficha de la empresa dice de qué gobierno es y a qué precio vende. Los periódicos cuentan cuándo se crea, se nacionaliza, se privatiza o se cierra una empresa pública, y cuándo se le fija un precio.

## Sistemas que propuse

**Ministerios**: el presidente los reparte entre su partido y quienes le votaron; cada uno da 1 PC por trimestre y la acción especial descrita arriba.

**Corrupción**: «Las cloacas» permiten financiación irregular, comisiones, clientelismo, espionaje o pagar abogados. Cada acción deja pruebas; cada trimestre hay un riesgo de que estallen según las pruebas acumuladas, la independencia judicial, la fiscalía y la transparencia (que también son leyes). Un escándalo trae multa, caída en las encuestas, imputados y titulares.

## Estructura de ficheros

```
index.html          punto de entrada
css/style.css       estilo de la interfaz
lib/three.bundle.js motor 3D (three.js r169)
lib/peerjs.min.js   conexión entre navegadores (PeerJS 1.5.4)
js/util.js          utilidades (aleatoriedad con semilla, formatos, D'Hondt…)
js/icons*.js        iconos (Lucide, licencia ISC) y logos de partido
js/data.js          contenido: debate, leyes, ministerios, misiones, eventos
js/faces.js         generador de retratos
js/world.js         generación del mundo, países, cantones y ciudadanía
js/economy.js       simulación económica trimestral
js/firms.js         empresas, centros públicos y mercados de bienes
js/labor.js         mercado de trabajo (ofertas, búsqueda, sueldos, despidos, mudanzas), cualificaciones, estudios y socios
js/finance.js       ahorro, bancos, préstamos, vivienda y construcción
js/markets.js       mercado mundial por cantones, transporte, aranceles y tratados
js/needs.js         necesidades y nivel de vida de los hogares
js/regions.js       culturas, fervor identitario, regionalistas, nombres y fusiones de cantones
js/foreign.js       países extranjeros: su simulación, partidos, leyes, elecciones, tratados y migración
js/politics.js      votos, encuestas, leyes, ideología, corrupción, ingresos
js/news.js          redacción de la prensa
js/game.js          reglas y fases (solo lo ejecuta el anfitrión)
js/net.js           sala, conexión y sincronización
js/scene*.js        escenas 3D: mapa, hemiciclo y plató
js/ui-*.js, app.js  interfaz
```

Opciones de la dirección útiles para pruebas: `?no3d=1` (sin 3D, para ordenadores muy lentos), `?fps=30` (limita los fotogramas), `?dev=1` (permite empezar con menos de 3 jugadores).
