import mintransporte from '../assets/mintransporte.webp'
import supertransporte from '../assets/supertransporte.webp'

// Documento FUEC con formato oficial (Resolución 0006652 de 2019).
const fmt = (iso) => (iso ? iso.split('-').reverse().join('/') : '')
const parte = (iso, i) => (iso ? iso.split('-')[i] : '')

export default function FuecDocumento({ f, empresa, qr }) {
  // Usa la "foto" de la empresa guardada en el FUEC; si es un FUEC antiguo sin foto, usa los datos actuales.
  const e = f?.empresa_snapshot || empresa || {}
  const razon = e.razon_social || e.nombre || 'EMPRESA DE TRANSPORTE ESPECIAL'

  return (
    <div className="fuec">
      <style>{`
        .fuec { width:100%; max-width:820px; margin:0 auto; color:#111; font-family: Arial, Helvetica, sans-serif; font-size:11px; background:#fff; }
        .fuec table { width:100%; border-collapse:collapse; }
        .fuec td, .fuec th { border:1px solid #111; padding:3px 6px; vertical-align:middle; }
        .fuec .center { text-align:center; }
        .fuec .b { font-weight:bold; }
        .fuec .title { text-align:center; font-weight:bold; font-size:12px; }
        .fuec .lbl { font-weight:bold; width:32%; }
        .fuec .sec { background:#f0f0f0; font-weight:bold; text-align:center; }
        .fuec .sm { font-size:9px; }
        .fuec .logo { height:54px; object-fit:contain; }
        .fuec .logo-sup { height:40px; object-fit:contain; }
      `}</style>

      {/* Encabezado con logos oficiales */}
      <table>
        <tbody>
          <tr className="center">
            <td style={{ width: '26%' }}><img className="logo" src={mintransporte} alt="Ministerio de Transporte" /></td>
            <td>
              {e.logo_url
                ? <img className="logo" src={e.logo_url} alt={razon} />
                : <><div className="b" style={{ fontSize: '15px' }}>{razon}</div><div className="sm">Transporte Terrestre Automotor Especial</div></>}
            </td>
            <td style={{ width: '26%' }}><img className="logo-sup" src={supertransporte} alt="Vigilado SuperTransporte" /></td>
          </tr>
        </tbody>
      </table>

      {/* Título */}
      <table><tbody>
        <tr><td className="title">
          FORMATO ÚNICO DE EXTRACTO DEL CONTRATO DEL SERVICIO PÚBLICO DE<br />
          TRANSPORTE TERRESTRE AUTOMOTOR ESPECIAL<br />
          <span style={{ fontWeight: 'normal' }}>NÚMERO: {f.numero_fuec || '—'}</span>
        </td></tr>
      </tbody></table>

      {/* Datos del contrato */}
      <table><tbody>
        <tr><td className="lbl">RAZÓN SOCIAL DE LA EMPRESA DE TRANSPORTE ESPECIAL</td><td>{razon}</td></tr>
        <tr><td className="lbl">NIT</td><td>{e.nit || '—'}</td></tr>
        <tr><td className="lbl">CONTRATO No.</td><td className="b">{f.no_maestro}-{f.contrato_hijo}</td></tr>
        <tr><td className="lbl">CONTRATANTE</td><td>{f.contratante_nombre || ''}</td></tr>
        <tr><td className="lbl">NIT/CC</td><td>{f.contratante_doc || ''}</td></tr>
        <tr><td className="lbl">OBJETO DE CONTRATO</td><td>{f.objeto_contrato || ''}</td></tr>
        <tr><td className="lbl">ORIGEN-DESTINO</td><td>{f.origen_destino || ''}</td></tr>
        <tr><td className="lbl sm">CONVENIO COLABORACIÓN · CONSORCIO · UNIÓN TEMPORAL · CON:</td><td>{f.estrategia_con || 'NO APLICA'}</td></tr>
      </tbody></table>

      {/* Vigencia */}
      <table><tbody>
        <tr><td className="sec" colSpan={4}>VIGENCIA DEL CONTRATO</td></tr>
        <tr className="center"><td></td><td className="b">DÍA</td><td className="b">MES</td><td className="b">AÑO</td></tr>
        <tr className="center"><td className="lbl">FECHA INICIAL</td><td>{parte(f.vigencia_inicio, 2)}</td><td>{parte(f.vigencia_inicio, 1)}</td><td>{parte(f.vigencia_inicio, 0)}</td></tr>
        <tr className="center"><td className="lbl">FECHA VENCIMIENTO</td><td>{parte(f.vigencia_fin, 2)}</td><td>{parte(f.vigencia_fin, 1)}</td><td>{parte(f.vigencia_fin, 0)}</td></tr>
      </tbody></table>

      {/* Vehículo */}
      <table><tbody>
        <tr><td className="sec" colSpan={4}>CARACTERÍSTICAS DEL VEHÍCULO</td></tr>
        <tr className="center b"><td>PLACA</td><td>MODELO</td><td>MARCA</td><td>CLASE</td></tr>
        <tr className="center"><td>{f.placa}</td><td>{f.modelo || ''}</td><td>{f.marca || ''}</td><td>{f.clase || ''}</td></tr>
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
        <tr className="center b sm"><td style={{ width: '20%' }}>RESPONSABLE DEL CONTRATANTE</td><td>NOMBRE Y APELLIDOS</td><td>NÚMERO DE CÉDULA</td><td>TELÉFONO</td><td>DIRECCIÓN</td></tr>
        <tr className="center"><td></td><td>{f.resp_nombre || ''}</td><td>{f.resp_cedula || ''}</td><td>{f.resp_telefono || ''}</td><td>{f.resp_direccion || ''}</td></tr>
      </tbody></table>

      {/* Pie con QR y firma */}
      <table><tbody>
        <tr>
          <td className="center" style={{ width: '50%' }}>
            <div className="b">{e.direccion || ''}{e.ciudad ? `, ${e.ciudad}` : ''}</div>
            <div>Tels: {e.telefonos || ''}</div>
            <div>{e.email || ''}</div>
            <div className="sm">Extracto válido hasta: {fmt(f.vigencia_fin)}</div>
          </td>
          <td className="center" style={{ width: '22%' }}>
            {qr && <img src={qr} alt="QR verificación" style={{ width: '92px', height: '92px' }} />}
            <div className="sm">Escanea para verificar</div>
          </td>
          <td className="center">
            <div style={{ height: '34px' }}></div>
            <div className="sm">Firma electrónica Ley 527 de 1999, Decreto 2364 de 2012</div>
          </td>
        </tr>
      </tbody></table>

      <div className="sm" style={{ marginTop: '6px', lineHeight: 1.4 }}>
        <p>El presente Extracto de Contrato no lleva sellos según Decreto 2150, Art. 11 de Diciembre de 1995 y el Decreto ley 019 de Enero de 2012 (Ley Antitrámites).</p>
        <p><b>Según la guía para la aplicación de la Resolución 3068 del 15 octubre de 2014</b> emitido por el Ministerio de Transporte, el nombre de las personas que se transportan no debe estar relacionado en el FUEC.</p>
        <p>El presente Extracto de Contrato <b>no lleva descripción de recorrido</b> según Resolución 0006652 del 27 dic 2019. · Generado con Movtek · Usuario: {f.usuario}</p>
      </div>
    </div>
  )
}
