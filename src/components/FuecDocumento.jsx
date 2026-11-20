import { useEffect, useState } from 'react'
import mintransporte from '../assets/mintransporte.webp'
import supertransporte from '../assets/supertransporte.webp'
import defaultLogo from '../assets/demo-logo.webp'
import defaultIso from '../assets/iso9001.png'
import { getLogosSistema } from '../lib/db'

// Iconos (línea, profesionales) para los datos de contacto del pie.
const IconPin = () => (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.4" /></svg>)
const IconPhone = () => (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.2a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" /></svg>)
const IconMail = () => (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>)
// Casilla de selección (marca con X la opción elegida: convenio / consorcio / unión temporal).
const Casilla = ({ on }) => (<span style={{ display: 'inline-block', width: '12px', height: '12px', border: '1.4px solid #000', textAlign: 'center', lineHeight: '11px', fontWeight: 'bold', fontSize: '11px', marginLeft: '5px', verticalAlign: 'middle' }}>{on ? 'X' : ''}</span>)

// Documento FUEC — réplica del formato oficial (Resolución 0006652 de 2019).
const fmt = (iso) => (iso ? iso.split('-').reverse().join('/') : '')
const dmy = (iso) => (iso ? iso.split('-') : ['', '', '']) // [a, m, d]

const TERRITORIALES = [
  ['Antioquia – Chocó', '305', 'Huila – Caquetá', '441'],
  ['Atlántico', '208', 'Magdalena', '247'],
  ['Bolívar - San Andrés Providencia', '213', 'Meta – Vaupés - Vichada', '550'],
  ['Boyacá – Casanare', '415', 'Nariño – Putumayo', '352'],
  ['Caldas', '317', 'N/Santander – Arauca', '454'],
  ['Cauca', '319', 'Quindío', '363'],
  ['Cesar', '220', 'Risaralda', '366'],
  ['Córdoba – Sucre', '223', 'Santander', '468'],
  ['Cundinamarca', '425', 'Tolima', '473'],
  ['Guajira', '241', 'Valle del Cauca', '376'],
]

function Encabezado({ razon, e, qr, pagina, logoSrc, isoSrc, minSrc, supSrc, marcaColor }) {
  return (
    <>
      <div className="hdbox">
        <div className="hdcell c-min"><img className="logo" src={minSrc} alt="Ministerio de Transporte" /></div>
        <div className="hdcell c-iso"><img className="iso" src={isoSrc} alt="ISO 9001" /></div>
        <div className="hdcell c-qr">{qr && <img className="qrh" src={qr} alt="QR" />}</div>
        <div className="hdcell c-emp">
          {logoSrc && <img className="logo-emp" src={logoSrc} alt={razon} />}
          <div className="emp-name">{razon}</div>
          <div className="emp-sub">Transporte Terrestre Automotor Especial</div>
        </div>
        <div className="hdcell c-sup"><img className="logo-sup" src={supSrc} alt="Vigilado SuperTransporte" /></div>
      </div>
      <table><tbody>
        <tr><td className="title">
          <span className="pg">Page {pagina} of 2</span>
          <div className="b">FORMATO ÚNICO DE EXTRACTO DEL CONTRATO DEL SERVICIO PÚBLICO DE<br />TRANSPORTE TERRESTRE AUTOMOTOR ESPECIAL</div>
          <div className="num b">NUMERO:{(e && e._num) || ''}</div>
        </td></tr>
      </tbody></table>
    </>
  )
}

export default function FuecDocumento({ f, empresa, qr }) {
  // La "foto" guardada manda; pero el logo y el sello ISO se toman de la empresa actual
  // si la foto no los tiene (para FUEC creados antes de agregar esos campos).
  const live = empresa || {}
  const e = { ...live, ...(f?.empresa_snapshot || {}), _num: f.numero_fuec || '' }
  // Logos del sistema (ISO, Ministerio, Vigilado): personalizados por el admin, o los de la app.
  const [sis, setSis] = useState({})
  useEffect(() => { getLogosSistema().then(setSis).catch(() => {}) }, [])
  // Logo: el de la empresa; si no tiene, el de demostración. El sello ISO es automático para todas.
  const logoSrc = e.logo_url || live.logo_url || defaultLogo
  const isoSrc = sis.iso_url || defaultIso
  const minSrc = sis.mintransporte_url || mintransporte
  const supSrc = sis.vigilado_url || supertransporte
  // Color de la marca de la empresa para la línea bajo el nombre (de la foto, o de la empresa actual).
  const marcaColor = e.color_primario || live.color_primario || '#e8821e'
  // Firma del representante legal (de la foto del FUEC, o de la empresa actual).
  const firmaSrc = e.firma_url || live.firma_url || ''
  const razon = e.razon_social || e.nombre || 'EMPRESA DE TRANSPORTE ESPECIAL'
  const estr = (f.estrategia_comercial || '').toUpperCase()
  const conValue = (f.estrategia_con && f.estrategia_con.toUpperCase() !== 'NO APLICA') ? f.estrategia_con : 'NO APLICA'
  const [ai, mi, di] = dmy(f.vigencia_inicio)
  const [av, mv, dv] = dmy(f.vigencia_fin)
  const marca = (estr === 'CONVENIO' ? 'conv' : estr === 'CONSORCIO' ? 'cons' : estr === 'UNIÓN TEMPORAL' ? 'ut' : '')

  // Alto de las filas de conductor según cuántos haya: con 1 van más altas y, al sumar
  // (hasta 7), se adelgazan para que el documento siga cabiendo en 2 hojas.
  const nCond = Math.max(1, (f.conductores || []).length)
  const condPadY = Math.max(1, 6 - (nCond - 1) * 0.8)          // 1→6px, 2→5.2, 3→4.4, … 7→1.2
  const condRow = { height: 'auto' }
  const condCell = {
    paddingTop: condPadY + 'px', paddingBottom: condPadY + 'px',
    lineHeight: 1.1, fontSize: nCond >= 6 ? '9px' : undefined,
  }
  // Las celdas del vehículo (placa, modelo, marca, clase, nº interno, tarjeta) también bajan de alto
  // cuando hay más conductores, para cederles espacio.
  const vehPadY = Math.max(2, 7 - nCond)                      // 1→6px … 5-7→2px
  const vehCell = { paddingTop: vehPadY + 'px', paddingBottom: vehPadY + 'px', lineHeight: 1.1 }

  return (
    <div className="fuec">
      <style>{`
        .fuec { width:100%; max-width:830px; margin:0 auto; color:#000; font-family: Arial, Helvetica, sans-serif; font-size:10px; text-transform:uppercase; }
        /* El texto legal / instructivo se deja en su redacción normal (legible). */
        .fuec .notas, .fuec .ins-wrap, .fuec .qr-note, .fuec .emp-sub, .fuec .firma-legal { text-transform:none; }
        .fuec, .fuec * { color:#000 !important; }
        .fuec-page { background:#fff; padding:12px; }
        .fuec table { width:100%; border-collapse:collapse; table-layout:fixed; }
        .fuec td, .fuec th { border:1px solid #000; padding:1px 5px; vertical-align:middle; word-wrap:break-word; }
        .fuec .center { text-align:center; }
        .fuec .b { font-weight:bold; }
        .fuec .sm { font-size:8px; }
        /* Encabezado — pegado a la tabla, bordes negros */
        .fuec .hdbox { display:flex; align-items:stretch; border:1px solid #000; border-bottom:none; overflow:hidden; }
        .fuec .hdcell { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:4px 6px; min-height:66px; box-sizing:border-box; }
        .fuec .hdcell img { object-fit:contain; max-width:100%; }
        .fuec .c-min { flex:0 0 13%; }
        .fuec .c-iso { flex:0 0 15%; }
        .fuec .c-qr { flex:0 0 14%; }
        .fuec .c-emp { flex:1 1 auto; }
        .fuec .c-sup { flex:0 0 16%; }
        .fuec .logo { height:44px; }
        .fuec .iso { height:54px; }
        .fuec .logo-emp { height:42px; width:auto; max-width:120px; object-fit:contain; margin-bottom:2px; }
        .fuec .qrh { height:58px; width:58px; }
        .fuec .logo-sup { height:auto; width:94%; max-height:54px; object-fit:contain; }
        .fuec .emp-name { display:inline-block; white-space:nowrap; font-size:14px; font-weight:bold; color:#000; padding-bottom:1px; margin-top:1px; }
        .fuec .emp-sub { font-style:italic; font-size:9px; color:#333; margin-top:1px; }
        .fuec .title { position:relative; text-align:center; padding:2px 8px; line-height:1.2; }
        .fuec .title .b { font-size:11px; }
        .fuec .title .num { font-size:10px; margin-top:2px; }
        .fuec .title .pg { position:absolute; right:8px; top:50%; transform:translateY(-50%); font-weight:normal; font-size:9px; }
        .fuec .lbl { font-weight:bold; }
        .fuec .sec { text-align:center; font-weight:bold; font-size:10px; }
        .fuec .tall td { height:24px; }
        .fuec .xtall td { height:32px; }
        .fuec .foot { font-size:8px; line-height:1.3; }
        .fuec .firma { border-top:1px solid #000; margin:2px 10px 0; padding-top:2px; }
        .fuec .vence-pill { display:inline-block; margin-top:4px; background:#111 !important; color:#fff !important; border-radius:999px; padding:1px 9px; font-size:8px; font-weight:bold; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        .fuec .notas td { font-size:7px; line-height:1.18; text-align:left; padding:2px 7px; }
        .fuec .notas p { margin:0 0 2px; } .fuec .notas p:last-child { margin-bottom:0; }
        /* Instructivo */
        .fuec .ins-wrap { border:1px solid #000; border-top:none; padding:16px 20px; }
        .fuec .ins-title { text-align:center; font-weight:bold; font-size:10px; margin-bottom:10px; }
        .fuec .ins-list { margin:0; padding:0; list-style:none; }
        .fuec .ins-list > li { margin:6px 0; line-height:1.4; display:flex; gap:7px; }
        .fuec .ins-list > li .ln { font-weight:bold; }
        .fuec .terr { width:90%; margin:10px auto; }
        .fuec .terr td { padding:1px 7px; font-size:9px; }
        .fuec .terr .cod { text-align:center; width:11%; }
        .fuec .ej { margin-top:8px; line-height:1.4; }
        .fuec .ej .num { font-weight:bold; letter-spacing:1px; }
        .fuec .qr-note { text-align:center; font-size:8.5px; color:#222; margin-top:12px; line-height:1.5; }
        /* Modo compacto (para impresión). */
        .fuec.compact { font-size:8px; line-height:1.12; }
        .fuec.compact td, .fuec.compact th { padding:1px 4px; }
        .fuec.compact .title .b { font-size:9.5px; }
        .fuec.compact .emp-name { font-size:12px; }
        .fuec.compact .objeto { font-size:7.5px; line-height:1.1; }
        .fuec.compact .fuec-page { padding:0; }
        /* Modo "llenar hoja" (para la descarga en PDF): filas más altas para ocupar toda la carta. */
        .fuec.pdffill td, .fuec.pdffill th { padding:6px 6px; }
        .fuec.pdffill .tall td { height:52px; }
        .fuec.pdffill .xtall td { height:74px; }
        .fuec.pdffill .objeto { min-height:78px; }
        .fuec.pdffill .hdcell { min-height:88px; }
        .fuec.pdffill .fuec-page { padding:0; }
        /* Página 2 (instructivo): más aire para llenar la hoja. */
        .fuec.pdffill .ins-wrap { padding:26px 30px; }
        .fuec.pdffill .ins-title { font-size:12px; margin-bottom:18px; }
        .fuec.pdffill .ins-list > li { margin:14px 0; line-height:1.6; }
        .fuec.pdffill .terr { margin:18px auto; }
        .fuec.pdffill .terr td { padding:5px 8px; font-size:10px; }
        .fuec.pdffill .ej { margin-top:18px; line-height:1.7; }
        .fuec.pdffill .qr-note { margin-top:26px; line-height:1.8; font-size:10px; }
        @media print {
          @page { size: Letter portrait; margin: 6mm; }
          .fuec { max-width:none; font-size:9.5px; line-height:1.25; }
          /* Mismas alturas que la descarga para que el FUEC llene toda la hoja carta. */
          .fuec td, .fuec th { padding:5px 6px; }
          .fuec .tall td { height:50px; }
          .fuec .xtall td { height:70px; }
          .fuec .objeto { min-height:74px; }
          .fuec .hdcell { min-height:86px; }
          .fuec .ins-wrap { padding:26px 30px; }
          .fuec .ins-title { font-size:12px; margin-bottom:18px; }
          .fuec .ins-list > li { margin:14px 0; line-height:1.6; }
          .fuec .terr { margin:18px auto; }
          .fuec .terr td { padding:5px 8px; font-size:10px; }
          .fuec .ej { margin-top:18px; line-height:1.7; }
          .fuec .qr-note { margin-top:26px; line-height:1.8; font-size:10px; }
          .fuec-page { padding:0 !important; }
          .fuec-page { page-break-inside: avoid; break-inside: avoid; }
          .fuec-page + .fuec-page { page-break-before: always; }
          .fuec .notas, .fuec .firma, table { page-break-inside: avoid; break-inside: avoid; }
        }
      `}</style>

      {/* ===================== PÁGINA 1 ===================== */}
      <div className="fuec-page">
        <Encabezado razon={razon} e={e} qr={qr} pagina={1} logoSrc={logoSrc} isoSrc={isoSrc} minSrc={minSrc} supSrc={supSrc} marcaColor={marcaColor} />

        {/* Datos del contrato */}
        <table><colgroup><col style={{ width: '38%' }} /><col /></colgroup><tbody>
          <tr><td className="lbl">RAZON SOCIAL DE LA EMPRESA DE TRANSPORTE ESPECIAL</td><td>{razon}</td></tr>
          <tr><td className="lbl">NIT:</td><td className="b">{e.nit || ''}</td></tr>
          <tr><td className="lbl">CONTRATO No:</td><td className="b">{f.no_maestro}-{f.contrato_hijo}</td></tr>
          <tr><td className="lbl">CONTRATANTE</td><td>{f.contratante_nombre || ''}</td></tr>
          <tr><td className="lbl">NIT/CC:</td><td className="b">{f.contratante_doc || ''}</td></tr>
          <tr><td className="lbl">OBJETO DE CONTRATO:</td><td className="objeto">{f.objeto_contrato || ''}</td></tr>
          <tr className="xtall"><td className="lbl">ORIGEN-DESTINO:</td><td className="objeto">{f.origen_destino || ''}</td></tr>
        </tbody></table>

        {/* Convenio / consorcio / unión temporal */}
        <table><colgroup><col style={{ width: '26%' }} /><col style={{ width: '20%' }} /><col style={{ width: '20%' }} /><col style={{ width: '8%' }} /><col /></colgroup><tbody>
          <tr className="sm">
            <td className="center"><span style={{ fontWeight: marca === 'conv' ? 'bold' : 'normal' }}>CONVENIO COLABORACIÓN</span><Casilla on={marca === 'conv'} /></td>
            <td className="center"><span style={{ fontWeight: marca === 'cons' ? 'bold' : 'normal' }}>CONSORCIO</span><Casilla on={marca === 'cons'} /></td>
            <td className="center"><span style={{ fontWeight: marca === 'ut' ? 'bold' : 'normal' }}>UNIÓN TEMPORAL</span><Casilla on={marca === 'ut'} /></td>
            <td className="center b">CON:</td>
            <td className="center">{conValue}</td>
          </tr>
        </tbody></table>

        {/* Vigencia */}
        <table><colgroup><col style={{ width: '38%' }} /><col /><col /><col /></colgroup><tbody>
          <tr><td className="sec" colSpan={4}>VIGENCIA DEL CONTRATO</td></tr>
          <tr className="center tall"><td className="lbl" style={{ textAlign: 'left' }}>FECHA INICIAL:</td>
            <td><div className="b">DIA</div>{di}</td><td><div className="b">MES</div>{mi}</td><td><div className="b">AÑO</div>{ai}</td></tr>
          <tr className="center tall"><td className="lbl" style={{ textAlign: 'left' }}>FECHA VENCIMIENTO:</td>
            <td><div className="b">DIA</div>{dv}</td><td><div className="b">MES</div>{mv}</td><td><div className="b">AÑO</div>{av}</td></tr>
        </tbody></table>

        {/* Vehículo */}
        <table><tbody>
          <tr><td className="sec" colSpan={4}>CARACTERÍSTICAS DEL VEHÍCULO</td></tr>
          <tr className="center b"><td>PLACA</td><td>MODELO</td><td>MARCA</td><td>CLASE</td></tr>
          <tr className="center" style={{ fontSize: '11px' }}><td className="b" style={vehCell}>{f.placa}</td><td style={vehCell}>{f.modelo || ''}</td><td style={vehCell}>{f.marca || ''}</td><td style={vehCell}>{f.clase || ''}</td></tr>
          <tr className="center b"><td colSpan={2}>NÚMERO INTERNO</td><td colSpan={2}>NÚMERO DE TARJETA DE OPERACIÓN</td></tr>
          <tr className="center"><td colSpan={2} style={vehCell}>{f.movil || ''}</td><td colSpan={2} style={vehCell}>{f.tarjeta_operacion || ''}</td></tr>
        </tbody></table>

        {/* Conductores — las filas se adelgazan según cuántos haya (1 = más altas, hasta 7 = delgadas)
            para que el FUEC siga cabiendo en 2 hojas. */}
        <table><colgroup><col style={{ width: '45%' }} /><col style={{ width: '18%' }} /><col style={{ width: '22%' }} /><col style={{ width: '15%' }} /></colgroup><tbody>
          <tr className="center b sm"><td>NOMBRES Y APELLIDOS.</td><td>NUMERO CÉDULA</td><td>NUMERO DE LICENCIA CONDUCCION</td><td>VIGENCIA</td></tr>
          {(f.conductores || []).map((c, i) => (
            <tr key={i} className="center" style={condRow}>
              <td style={{ textAlign: 'left', ...condCell }}><span className="sm" style={{ color: '#333' }}>DATOS DEL CONDUCTOR</span>&nbsp;&nbsp;{i + 1}- {c.nombre}</td>
              <td style={condCell}>{c.documento || ''}</td><td style={condCell}>{c.licencia_numero || ''}</td><td style={condCell}>{fmt(c.licencia_vencimiento)}</td>
            </tr>
          ))}
          {!(f.conductores || []).length && <tr><td colSpan={4} className="center sm">Sin conductores</td></tr>}
        </tbody></table>

        {/* Responsable del contratante */}
        <table><colgroup><col style={{ width: '17%' }} /><col style={{ width: '27%' }} /><col style={{ width: '16%' }} /><col style={{ width: '16%' }} /><col /></colgroup><tbody>
          <tr className="center b sm"><td rowSpan={2}>RESPONSABLE DEL CONTRATANTE</td><td>NOMBRE Y APELLIDOS</td><td>NUMERO DE CEDULA</td><td>TELEFONO</td><td>DIRECCIÓN</td></tr>
          <tr className="center tall"><td>{f.resp_nombre || ''}</td><td>{f.resp_cedula || ''}</td><td>{f.resp_telefono || ''}</td><td>{f.resp_direccion || ''}</td></tr>
        </tbody></table>

        {/* Pie con QR y firma */}
        <table><colgroup><col style={{ width: '48%' }} /><col style={{ width: '22%' }} /><col /></colgroup><tbody>
          <tr className="xtall">
            <td style={{ verticalAlign: 'middle' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                {logoSrc && <img src={logoSrc} alt="" style={{ height: '50px', maxWidth: '108px', objectFit: 'contain', flex: 'none' }} />}
                <div style={{ textAlign: 'left', lineHeight: 1.55 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}><IconPin />{e.direccion || ''}{e.ciudad ? `, ${e.ciudad}` : ''}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><IconPhone />{e.telefonos || ''}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', textTransform: 'none' }}><IconMail />{(e.email || '').toLowerCase()}</div>
                  <div className="vence-pill">Válido hasta {f.vigencia_fin || ''}</div>
                </div>
              </div>
            </td>
            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{qr && <img src={qr} alt="QR verificación" style={{ width: '70px', height: '70px', display: 'block', margin: '0 auto' }} />}</td>
            <td className="center">
              {firmaSrc && <img src={firmaSrc} alt="Firma del representante legal" style={{ maxHeight: '34px', maxWidth: '92%', display: 'block', margin: '6px auto -4px' }} />}
              <div className="firma b">{razon}</div>
              <div className="sm firma-legal">Firma electrónica Ley 527 de 1999, Decreto 2364 de 2012</div>
            </td>
          </tr>
        </tbody></table>

        {/* Notas al pie — todo en una sola barra */}
        <table className="notas"><tbody>
          <tr><td>
            <p>El presente Extracto de Contrato, no lleva sellos según Decreto 2150, Art. 11 de Diciembre de 1995 y el Decreto ley 019 de Enero de 2012 (Ley Antitramites).</p>
            <p><b>***SEGUN LA GUIA PARA LA APLICACION DE LA RESOLUCION 3068 DEL 15 OCTUBRE DE 2014 EMITIDO POR EL MINISTERIO DE TRANSPORTE EN EL PUNTO 2 SE ESPECIFICA, QUE EL NOMBRE DE LAS PERSONAS QUE SE TRANSPORTARAN NO DEBEN ESTAR RELACIONADAS EN EL FUEC***</b></p>
            <p>El presente Extracto de Contrato, <b>no lleva DESCRIPCIÓN DE RECORRIDO</b> según RESOLUCION 0006652 DEL 27 dic 2019, Y Se actualiza Ficha tecnica del formato ,logos (FUEC)</p>
          </td></tr>
        </tbody></table>
      </div>

      {/* ===================== PÁGINA 2 · INSTRUCTIVO ===================== */}
      <div className="fuec-page">
        <Encabezado razon={razon} e={e} qr={qr} pagina={2} logoSrc={logoSrc} isoSrc={isoSrc} minSrc={minSrc} supSrc={supSrc} marcaColor={marcaColor} />

        <div className="ins-wrap">
          <div className="ins-title">INSTRUCTIVO PARA LA DETERMINACIÓN DEL NÚMERO CONSECUTIVO DEL FUEC</div>
          <p>El formato único de extracto del contrato “FUEC” estará constituido por los siguientes números:</p>

          <ul className="ins-list">
            <li><span className="ln">a)</span><span>Los tres primeros dígitos de la izquierda a derecha corresponden al código de la Dirección Territorial que otorgó la habilitación de la empresa de transporte de Servicios Especiales.</span></li>
          </ul>

          <table className="terr"><tbody>
            {TERRITORIALES.map((r, i) => (
              <tr key={i}>
                <td>{r[0]}</td><td className="cod">{r[1]}</td>
                <td>{r[2]}</td><td className="cod">{r[3]}</td>
              </tr>
            ))}
          </tbody></table>

          <ul className="ins-list">
            <li><span className="ln">b)</span><span>Los cuatro dígitos siguientes señalarán el número de resolución mediante la cual se otorgó la habilitación de la Empresa. En caso que la resolución no tenga estos dígitos, los faltantes serán completados con ceros a la izquierda.</span></li>
            <li><span className="ln">c)</span><span>Los dos dígitos, corresponderán a los dos últimos del año en que la empresa fue habilitada.</span></li>
            <li><span className="ln">d)</span><span>A continuación cuatro dígitos que corresponden al año que se pide el extracto de contrato.</span></li>
            <li><span className="ln">e)</span><span>Posteriormente, cuatro números que identifican el número de contrato. La numeración debe ser consecutiva, establecida por cada empresa e iniciará con los contratos de la prestación de servicio celebrados para el transporte de estudiantes, asalariados, turistas o grupo de usuarios, vigente al momento de entrar en vigor la presente resolución.</span></li>
            <li><span className="ln">f)</span><span>Finalmente, los cuatro últimos dígitos corresponderán al número consecutivo del extracto de contrato. Se debe expedir un número de extracto por vencimiento del plazo inicial del mismo o por cambio del vehículo.</span></li>
          </ul>

          <div className="ej">
            <b>EJEMPLO:</b> Empresa habilitada por la dirección territorial Cundinamarca en el año 2012, con resolución habilitada No. 0155, que expide el primer extracto del contrato en el año 2015, del contrato 255. El número del Formato Único De Extracto Del Contrato “FUEC” será: <span className="num">425 0155 12 2015 0255 0001</span>.
          </div>

          <div className="qr-note">
            Señor ente de control, para comprobar la información y su integridad del FUEC, por favor escanee el código QR con un lector QR; este lo llevará al servidor de verificación de <b>Movtek</b> por una conexión segura (SSL). Para brindar seguridad y entregar datos auténticos, reales y confiables al ingresar datos personales. Si no cuenta con lector, puede comunicarse al teléfono de la Empresa.
          </div>
        </div>
      </div>
    </div>
  )
}
