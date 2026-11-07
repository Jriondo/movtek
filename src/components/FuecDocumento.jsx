import mintransporte from '../assets/mintransporte.webp'
import supertransporte from '../assets/supertransporte.webp'

// Documento FUEC con formato oficial (Resolución 0006652 de 2019).
const fmt = (iso) => (iso ? iso.split('-').reverse().join('/') : '')
const parte = (iso, i) => (iso ? iso.split('-')[i] : '')

// Códigos de la Dirección Territorial (instructivo del número consecutivo).
const TERRITORIALES = [
  ['Antioquia – Chocó', '305', 'Huila – Caquetá', '441'],
  ['Atlántico', '208', 'Magdalena', '247'],
  ['Bolívar - San Andrés Providencia', '213', 'Meta – Vaupés - Vichada', '550'],
  ['Boyacá – Casanare', '415', 'Nariño – Putumayo', '352'],
  ['Caldas', '517', 'N/Santander – Arauca', '454'],
  ['Cauca', '319', 'Quindío', '363'],
  ['Cesar', '220', 'Risaralda', '366'],
  ['Córdoba – Sucre', '223', 'Santander', '468'],
  ['Cundinamarca', '425', 'Tolima', '473'],
  ['Guajira', '241', 'Valle del Cauca', '376'],
]

function Encabezado({ razon, e }) {
  return (
    <table className="head">
      <tbody>
        <tr>
          <td style={{ width: '28%', textAlign: 'center' }}><img className="logo" src={mintransporte} alt="Ministerio de Transporte" /></td>
          <td style={{ textAlign: 'center' }}>
            {e.logo_url && <div><img className="logo-emp" src={e.logo_url} alt={razon} /></div>}
            <div className="b" style={{ fontSize: '15px', letterSpacing: '.3px' }}>{razon}</div>
            <div className="sm" style={{ color: '#555' }}>Transporte Terrestre Automotor Especial</div>
          </td>
          <td style={{ width: '28%', textAlign: 'center' }}><img className="logo-sup" src={supertransporte} alt="Vigilado SuperTransporte" /></td>
        </tr>
      </tbody>
    </table>
  )
}

function Titulo({ num, pagina }) {
  return (
    <table><tbody>
      <tr><td className="title">
        FORMATO ÚNICO DE EXTRACTO DEL CONTRATO DEL SERVICIO PÚBLICO DE<br />
        TRANSPORTE TERRESTRE AUTOMOTOR ESPECIAL
        <div className="title-num">NÚMERO: {num || '—'}</div>
        <div className="pag">Página {pagina} de 2</div>
      </td></tr>
    </tbody></table>
  )
}

export default function FuecDocumento({ f, empresa, qr }) {
  // Usa la "foto" de la empresa guardada en el FUEC; si es un FUEC antiguo sin foto, usa los datos actuales.
  const e = f?.empresa_snapshot || empresa || {}
  const razon = e.razon_social || e.nombre || 'EMPRESA DE TRANSPORTE ESPECIAL'
  const numero = f.numero_fuec || ''
  const estr = (f.estrategia_comercial || '').toUpperCase()
  const conValue = (f.estrategia_con && f.estrategia_con.toUpperCase() !== 'NO APLICA') ? f.estrategia_con : 'N/A'

  return (
    <div className="fuec">
      <style>{`
        .fuec { width:100%; max-width:820px; margin:0 auto; color:#1a1a1a; font-family: Arial, Helvetica, sans-serif; font-size:11px; }
        .fuec-page { background:#fff; padding:14px; }
        .fuec table { width:100%; border-collapse:collapse; }
        .fuec td, .fuec th { border:1px solid #222; padding:4px 7px; vertical-align:middle; }
        .fuec .head td { border:none; }
        .fuec .center { text-align:center; }
        .fuec .b { font-weight:bold; }
        .fuec .title { text-align:center; font-weight:bold; font-size:12.5px; line-height:1.35; padding:7px; }
        .fuec .title-num { font-weight:normal; font-size:11px; margin-top:3px; letter-spacing:.5px; }
        .fuec .pag { font-weight:normal; font-size:9px; color:#666; margin-top:1px; }
        .fuec .lbl { font-weight:bold; width:32%; background:#fafafa; }
        .fuec .sec { background:#e8eef1; font-weight:bold; text-align:center; letter-spacing:.4px; }
        .fuec .sm { font-size:9px; }
        .fuec .logo { height:56px; object-fit:contain; max-width:100%; }
        .fuec .logo-sup { height:42px; object-fit:contain; max-width:100%; }
        .fuec .logo-emp { height:48px; object-fit:contain; max-width:100%; margin-bottom:3px; }
        .fuec .foot { font-size:8.5px; color:#444; margin-top:7px; line-height:1.45; }
        .fuec .foot p { margin:2px 0; }
        .fuec .firma-linea { border-top:1px solid #222; margin-top:28px; padding-top:3px; }
        /* Instructivo */
        .fuec .ins-wrap { border:2px solid #222; border-radius:16px; padding:18px 22px; margin-top:6px; }
        .fuec .ins-title { text-align:center; font-weight:bold; font-size:11px; margin-bottom:12px; letter-spacing:.3px; }
        .fuec .ins-list { margin:0; padding:0; list-style:none; }
        .fuec .ins-list > li { margin:7px 0; line-height:1.4; display:flex; gap:8px; }
        .fuec .ins-list > li .ln { font-weight:bold; }
        .fuec .terr { margin:12px auto; width:92%; }
        .fuec .terr td { padding:2px 8px; font-size:10px; }
        .fuec .terr .cod { text-align:center; width:12%; font-weight:bold; }
        .fuec .ej { margin-top:10px; line-height:1.45; }
        .fuec .ej .num { font-weight:bold; letter-spacing:1px; }
        .fuec .qr-note { text-align:center; font-size:9px; color:#444; margin-top:14px; line-height:1.5; }
        @media print {
          .fuec-page { padding:0; }
          .fuec-page.pb { page-break-after: always; }
        }
      `}</style>

      {/* ===================== PÁGINA 1 ===================== */}
      <div className="fuec-page pb">
        <Encabezado razon={razon} e={e} />
        <Titulo num={numero} pagina={1} />

        {/* Datos del contrato */}
        <table><tbody>
          <tr><td className="lbl">RAZÓN SOCIAL DE LA EMPRESA DE TRANSPORTE ESPECIAL</td><td>{razon}</td></tr>
          <tr><td className="lbl">NIT</td><td>{e.nit || '—'}</td></tr>
          <tr><td className="lbl">CONTRATO No.</td><td className="b">{f.no_maestro}-{f.contrato_hijo}</td></tr>
          <tr><td className="lbl">CONTRATANTE</td><td>{f.contratante_nombre || ''}</td></tr>
          <tr><td className="lbl">NIT/CC</td><td>{f.contratante_doc || ''}</td></tr>
          <tr><td className="lbl">OBJETO DE CONTRATO</td><td>{f.objeto_contrato || ''}</td></tr>
          <tr><td className="lbl">ORIGEN-DESTINO</td><td>{f.origen_destino || ''}</td></tr>
        </tbody></table>

        {/* Convenio / Consorcio / Unión temporal — marca X en el que corresponda */}
        <table><tbody>
          <tr className="center b sm">
            <td>CONVENIO COLABORACIÓN</td>
            <td>CONSORCIO</td>
            <td>UNIÓN TEMPORAL</td>
            <td rowSpan={2} style={{ width: '10%' }}>CON:</td>
            <td rowSpan={2}>{conValue}</td>
          </tr>
          <tr className="center b" style={{ fontSize: '14px' }}>
            <td>{estr === 'CONVENIO' ? 'X' : ''}</td>
            <td>{estr === 'CONSORCIO' ? 'X' : ''}</td>
            <td>{estr === 'UNIÓN TEMPORAL' ? 'X' : ''}</td>
          </tr>
        </tbody></table>

        {/* Vigencia */}
        <table><tbody>
          <tr><td className="sec" colSpan={4}>VIGENCIA DEL CONTRATO</td></tr>
          <tr className="center b"><td style={{ width: '32%' }}></td><td>DÍA</td><td>MES</td><td>AÑO</td></tr>
          <tr className="center"><td className="lbl">FECHA INICIAL</td><td>{parte(f.vigencia_inicio, 2)}</td><td>{parte(f.vigencia_inicio, 1)}</td><td>{parte(f.vigencia_inicio, 0)}</td></tr>
          <tr className="center"><td className="lbl">FECHA VENCIMIENTO</td><td>{parte(f.vigencia_fin, 2)}</td><td>{parte(f.vigencia_fin, 1)}</td><td>{parte(f.vigencia_fin, 0)}</td></tr>
        </tbody></table>

        {/* Vehículo */}
        <table><tbody>
          <tr><td className="sec" colSpan={4}>CARACTERÍSTICAS DEL VEHÍCULO</td></tr>
          <tr className="center b"><td>PLACA</td><td>MODELO</td><td>MARCA</td><td>CLASE</td></tr>
          <tr className="center"><td className="b">{f.placa}</td><td>{f.modelo || ''}</td><td>{f.marca || ''}</td><td>{f.clase || ''}</td></tr>
          <tr className="center b"><td colSpan={2}>NÚMERO INTERNO</td><td colSpan={2}>NÚMERO DE TARJETA DE OPERACIÓN</td></tr>
          <tr className="center"><td colSpan={2}>{f.movil || ''}</td><td colSpan={2}>{f.tarjeta_operacion || ''}</td></tr>
        </tbody></table>

        {/* Conductores */}
        <table><tbody>
          <tr className="center b sm"><td>NOMBRES Y APELLIDOS</td><td>NÚMERO CÉDULA</td><td>NÚMERO DE LICENCIA CONDUCCIÓN</td><td>VIGENCIA</td></tr>
          {(f.conductores || []).map((c, i) => (
            <tr key={i} className="center"><td>{i + 1}- {c.nombre}</td><td>{c.documento || ''}</td><td>{c.licencia_numero || ''}</td><td>{fmt(c.licencia_vencimiento)}</td></tr>
          ))}
          {!(f.conductores || []).length && <tr><td colSpan={4} className="center sm">Sin conductores</td></tr>}
        </tbody></table>

        {/* Responsable del contratante */}
        <table><tbody>
          <tr className="center b sm">
            <td rowSpan={2} style={{ width: '20%' }}>RESPONSABLE DEL CONTRATANTE</td>
            <td>NOMBRE Y APELLIDOS</td><td>NÚMERO DE CÉDULA</td><td>TELÉFONO</td><td>DIRECCIÓN</td>
          </tr>
          <tr className="center"><td>{f.resp_nombre || ''}</td><td>{f.resp_cedula || ''}</td><td>{f.resp_telefono || ''}</td><td>{f.resp_direccion || ''}</td></tr>
        </tbody></table>

        {/* Pie con QR y firma */}
        <table><tbody>
          <tr>
            <td className="center" style={{ width: '48%' }}>
              <div className="b">{e.direccion || ''}{e.ciudad ? `, ${e.ciudad}` : ''}</div>
              <div>Tels: {e.telefonos || ''}</div>
              <div>{e.email || ''}</div>
              <div className="sm" style={{ marginTop: '2px' }}>Extracto válido hasta: {fmt(f.vigencia_fin)}</div>
            </td>
            <td className="center" style={{ width: '22%' }}>
              {qr && <img src={qr} alt="QR verificación" style={{ width: '96px', height: '96px' }} />}
              <div className="sm">Escanea para verificar</div>
            </td>
            <td className="center">
              {e.logo_url && <img className="logo-emp" src={e.logo_url} alt={razon} style={{ maxHeight: '34px' }} />}
              <div className="firma-linea b">{razon}</div>
              <div className="sm">Firma electrónica Ley 527 de 1999, Decreto 2364 de 2012</div>
            </td>
          </tr>
        </tbody></table>

        <div className="foot">
          <p>El presente Extracto de Contrato no lleva sellos según Decreto 2150, Art. 11 de Diciembre de 1995 y el Decreto ley 019 de Enero de 2012 (Ley Antitrámites).</p>
          <p><b>Según la guía para la aplicación de la Resolución 3068 del 15 octubre de 2014</b> emitido por el Ministerio de Transporte, el nombre de las personas que se transportan no debe estar relacionado en el FUEC.</p>
          <p>El presente Extracto de Contrato <b>no lleva descripción de recorrido</b> según Resolución 0006652 del 27 dic 2019.</p>
        </div>
      </div>

      {/* ===================== PÁGINA 2 · INSTRUCTIVO ===================== */}
      <div className="fuec-page">
        <Encabezado razon={razon} e={e} />
        <Titulo num={numero} pagina={2} />

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
