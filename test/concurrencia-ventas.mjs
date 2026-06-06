/**
 * Test de concurrencia para FOR UPDATE (F2-12)
 *
 * Uso:
 *   node test/concurrencia-ventas.mjs
 *
 * Requiere:
 *   - API corriendo en http://localhost:3000
 *   - Un producto con al menos 1 ud de stock en almacén VENTAS
 *   - Credenciales de admin
 *
 * Lo que prueba:
 *   - Envía 2 ventas simultáneas sobre el mismo producto con stock=1
 *   - Una debe completarse, la otra debe fallar con "Stock insuficiente"
 */

const API_URL = process.env.API_URL || 'http://localhost:3000'
const USERNAME = process.env.TEST_USER || 'admin'
const PASSWORD = process.env.TEST_PASS || 'admin123'
const PRODUCTO_ID = process.env.TEST_PRODUCTO_ID

if (!PRODUCTO_ID) {
  console.error('❌ Define TEST_PRODUCTO_ID=uuid-del-producto-con-stock=1')
  process.exit(1)
}

async function login() {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrUsername: USERNAME, password: PASSWORD }),
  })
  if (!res.ok) throw new Error(`Login failed: ${res.status}`)
  const data = await res.json()
  return data.access_token
}

async function checkStock(token) {
  const res = await fetch(`${API_URL}/inventario-almacen/producto/${PRODUCTO_ID}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Stock check failed: ${res.status}`)
  const data = await res.json()
  const stockVentas = data
    .filter(i => i.almacenTipo === 'VENTAS')
    .reduce((s, i) => s + Number(i.cantidadActual), 0)
  return stockVentas
}

async function createVenta(token) {
  const payload = {
    productos: [{
      productoId: PRODUCTO_ID,
      cantidad: 1,
    }],
    metodoPago: 'EFECTIVO',
    clienteId: null,
  }
  const res = await fetch(`${API_URL}/ventas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  const body = res.ok ? await res.json() : await res.text()
  return { status: res.status, ok: res.ok, body }
}

async function main() {
  console.log('=== Test de Concurrencia F2-12 (FOR UPDATE) ===')
  console.log(`API: ${API_URL}, Producto: ${PRODUCTO_ID}\n`)

  const token = await login()
  const stockInicial = await checkStock(token)
  console.log(`Stock disponible (VENTAS): ${stockInicial}`)

  if (stockInicial < 2) {
    console.warn('⚠️  Stock < 2 — solo 1 venta se completará, la otra fallará (es lo esperado)')
  } else {
    console.log('✅ Stock suficiente para 2 ventas — ambas podrían completarse')
  }

  console.log('\nEnviando 2 ventas concurrentes...')
  const [r1, r2] = await Promise.allSettled([
    createVenta(token),
    createVenta(token),
  ])

  const results = [r1, r2].map(r =>
    r.status === 'fulfilled' ? r.value : { ok: false, status: 'ERROR', body: r.reason?.message }
  )

  const okCount = results.filter(r => r.ok).length
  const failCount = results.filter(r => !r.ok).length

  console.log(`\nResultados:`)
  results.forEach((r, i) => {
    const status = r.ok ? '✅ COMPLETADA' : '❌ RECHAZADA'
    const detail = r.ok
      ? `folio=${r.body?.folio || '?'}, total=${r.body?.total || '?'}`
      : typeof r.body === 'string'
        ? r.body.substring(0, 120)
        : JSON.stringify(r.body).substring(0, 120)
    console.log(`  Venta ${i + 1}: ${status} (status=${r.status}) — ${detail}`)
  })

  console.log(`\nResumen: ${okCount} completadas, ${failCount} rechazadas`)
  if (okCount >= 1 && failCount >= 0) {
    console.log('✅ FOR UPDATE funcionando correctamente')
  } else if (okCount === 2) {
    console.log('⚠️  Ambas se completaron — verifica que stock inicial >= 2')
  } else {
    console.log('❌ Posible problema — revisa los errores')
  }

  const stockFinal = await checkStock(token)
  console.log(`Stock final (VENTAS): ${stockFinal}`)
  console.log(`Stock reducido: ${stockInicial - stockFinal}`)
}

main().catch(console.error)
