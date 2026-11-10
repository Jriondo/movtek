import { useEffect, useState } from 'react'
import mintransporte from '../assets/mintransporte.webp'
import supertransporte from '../assets/supertransporte.webp'
import defaultLogo from '../assets/demo-logo.webp'
import defaultIso from '../assets/iso9001.png'
import { getLogosSistema } from '../lib/db'

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
        <div className="hdcell c-emp">
          <div className="emp-logos">
            <img className="logo-emp" src={logoSrc} alt={razon} />
            <img className="logo-sup" src={supSrc} alt="Vigilado SuperTransporte" />
          </div>
          <div className="emp-name">{razon}</div>
          <div className="emp-sub">Transporte Terrestre Automotor Especial</div>
        </div>
        <div className="hdcell c-qr">{qr && <img className="qrh" src={qr} alt="QR" />}</div>
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

  return (
    <div className="fuec">
      <style>{`
        .fuec { width:100%; max-width:830px; margin:0 auto; color:#000; font-family: Arial, Helvetica, sans-serif; font-size:10px; text-transform:uppercase; }
        /* El texto legal / instructivo se deja en su redacción normal (legible). */
        .fuec .notas, .fuec .ins-wrap, .fuec .qr-note, .fuec .emp-sub, .fuec .firma-legal { text-transform:none; }
        .fuec, .fuec * { color:#000 !important; }
        .fuec-page { background:#fff; padding:12px; }
        .fuec table { width:100%; border-collapse:collapse; table-layout:fixed; }
        .fuec td, .fuec th { border:1px solid #000; padding:3px 6px; vertical-align:middle; word-wrap:break-word; }
        .fuec .center { text-align:center; }
        .fuec .b { font-weight:bold; }
        .fuec .sm { font-size:8px; }
        /* Encabezado — pegado a la tabla, bordes negros */
        .fuec .hdbox { display:flex; align-items:stretch; border:1px solid #000; border-bottom:none; overflow:hidden; }
        .fuec .hdcell { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:8px 6px; border-right:1px solid #000; min-height:94px; box-sizing:border-box; }
        .fuec .hdcell:last-child { border-right:none; }
        .fuec .hdcell img { object-fit:contain; max-width:100%; }
        .fuec .c-min { flex:0 0 15%; }
        .fuec .c-iso { flex:0 0 16%; }
        .fuec .c-emp { flex:1 1 auto; }
        .fuec .c-qr { flex:0 0 15%; }
        .fuec .logo { height:62px; }
        .fuec .iso { height:76px; }
        .fuec .emp-logos { display:flex; align-items:center; justify-content:center; gap:18px; margin-bottom:2px; }
        .fuec .logo-emp { height:56px; width:auto; max-width:150px; object-fit:contain; }
        .fuec .qrh { height:72px; width:72px; }
        .fuec .logo-sup { height:42px; width:auto; max-width:170px; object-fit:contain; }
        .fuec .emp-name { display:inline-block; white-space:nowrap; font-size:15px; font-weight:bold; color:#000; padding-bottom:2px; margin-top:4px; }
        .fuec .emp-sub { font-style:italic; font-size:10px; color:#333; margin-top:3px; }
        .fuec .title { position:relative; text-align:center; padding:7px 8px; line-height:1.35; }
        .fuec .title .b { font-size:11px; }
        .fuec .title .num { font-size:10px; margin-top:2px; }
        .fuec .title .pg { position:absolute; right:8px; top:50%; transform:translateY(-50%); font-weight:normal; font-size:9px; }
        .fuec .lbl { font-weight:bold; }
        .fuec .sec { text-align:center; font-weight:bold; font-size:10px; }
        .fuec .tall td { height:38px; }
        .fuec .xtall td { height:56px; }
        .fuec .foot { font-size:8px; line-height:1.4; }
        .fuec .firma { border-top:1px solid #000; margin:2px 10px 0; padding-top:2px; }
        .fuec .notas td { font-size:8px; line-height:1.45; text-align:left; padding:6px 8px; }
        .fuec .notas p { margin:0 0 5px; } .fuec .notas p:last-child { margin-bottom:0; }
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
        @media print {
          @page { size: Letter portrait; margin: 7mm; }
          .fuec { max-width:none; }
          .fuec-page { padding:0 !important; }
          .fuec-page + .fuec-page { page-break-before: always; }
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
          <tr><td className="lbl">OBJETO DE CONTRATO:</td><td>{f.objeto_contrato || ''}</td></tr>
          <tr className="xtall"><td className="lbl">ORIGEN-DESTINO:</td><td>{f.origen_destino || ''}</td></tr>
        </tbody></table>

        {/* Convenio / consorcio / unión temporal */}
        <table><colgroup><col style={{ width: '26%' }} /><col style={{ width: '20%' }} /><col style={{ width: '20%' }} /><col style={{ width: '8%' }} /><col /></colgroup><tbody>
          <tr className="sm">
            <td>CONVENIO COLABORACIÓN {marca === 'conv' ? ' X' : ''}</td>
            <td className="center">CONSORCIO {marca === 'cons' ? ' X' : ''}</td>
            <td className="center">UNION TEMPORAL {marca === 'ut' ? ' X' : ''}</td>
            <td className="center">CON:</td>
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
          <tr className="center tall" style={{ fontSize: '11px' }}><td className="b">{f.placa}</td><td>{f.modelo || ''}</td><td>{f.marca || ''}</td><td>{f.clase || ''}</td></tr>
          <tr className="center b"><td colSpan={2}>NÚMERO INTERNO</td><td colSpan={2}>NÚMERO DE TARJETA DE OPERACIÓN</td></tr>
          <tr className="center tall"><td colSpan={2}>{f.movil || ''}</td><td colSpan={2}>{f.tarjeta_operacion || ''}</td></tr>
        </tbody></table>

        {/* Conductores */}
        <table><colgroup><col style={{ width: '45%' }} /><col style={{ width: '18%' }} /><col style={{ width: '22%' }} /><col style={{ width: '15%' }} /></colgroup><tbody>
          <tr className="center b sm"><td>NOMBRES Y APELLIDOS.</td><td>NUMERO CÉDULA</td><td>NUMERO DE LICENCIA CONDUCCION</td><td>VIGENCIA</td></tr>
          {(f.conductores || []).map((c, i) => (
            <tr key={i} className="center">
              <td style={{ textAlign: 'left' }}><span className="sm" style={{ color: '#333' }}>DATOS DEL CONDUCTOR</span>&nbsp;&nbsp;{i + 1}- {c.nombre}</td>
              <td>{c.documento || ''}</td><td>{c.licencia_numero || ''}</td><td>{fmt(c.licencia_vencimiento)}</td>
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
            <td className="center">
              <div className="b">{e.direccion || ''}{e.ciudad ? `, ${e.ciudad}` : ''}</div>
              <div>Tels: {e.telefonos || ''}</div>
              <div>{e.email || ''}</div>
              <div className="sm" style={{ marginTop: '3px' }}>Extracto valido hasta: {f.vigencia_fin || ''}</div>
            </td>
            <td className="center">{qr && <img src={qr} alt="QR verificación" style={{ width: '82px', height: '82px' }} />}</td>
            <td className="center">
              {firmaSrc && <img src={firmaSrc} alt="Firma del representante legal" style={{ maxHeight: '46px', maxWidth: '92%', display: 'block', margin: '30px auto -4px' }} />}
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
