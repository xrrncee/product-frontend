import { useEffect, useState } from 'react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

async function request(path, { token, ...options } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const responseBody = response.status === 204 ? '' : await response.text();
  let payload = null;

  if (responseBody.trim()) {
    try {
      payload = JSON.parse(responseBody);
    } catch {
      throw new Error(`API returned a non-JSON response (HTTP ${response.status}). Check the API URL and backend logs.`);
    }
  }

  if (response.ok && response.status !== 204 && payload === null) {
    throw new Error(`API returned an empty response (HTTP ${response.status}). Check the backend logs.`);
  }

  if (!response.ok) throw new Error(payload?.error || `API request failed (HTTP ${response.status}).`);
  return payload;
}

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('inventory-token') || '');
  const [user, setUser] = useState(() => sessionStorage.getItem('inventory-user') || '');
  const [role, setRole] = useState(() => sessionStorage.getItem('inventory-role') || '');
  const [products, setProducts] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [search, setSearch] = useState('');
  const [formProduct, setFormProduct] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadProducts(currentToken = token) {
    setLoading(true);
    setError('');
    try {
      const result = await request('/api/products', { token: currentToken });
      setProducts(result.data || []);
    } catch (requestError) {
      setError(requestError.message);
      if (requestError.message === 'Unauthorized') signOut(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadProducts(token);
  }, [token]);

  async function handleLogin(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await request('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      sessionStorage.setItem('inventory-token', result.access_token);
      sessionStorage.setItem('inventory-user', result.user.username);
      sessionStorage.setItem('inventory-role', result.user.role);
      setUser(result.user.username);
      setRole(result.user.role);
      setToken(result.access_token);
      setPassword('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  function signOut(notify = true) {
    const activeToken = token;
    sessionStorage.removeItem('inventory-token');
    sessionStorage.removeItem('inventory-user');
    sessionStorage.removeItem('inventory-role');
    setToken('');
    setUser('');
    setRole('');
    setProducts([]);
    setFormProduct(null);
    if (notify && activeToken) request('/api/logout', { method: 'POST', token: activeToken }).catch(() => {});
  }

  async function saveProduct(event) {
    event.preventDefault();
    const editing = Boolean(formProduct?.id);
    const payload = {
      product_name: event.currentTarget.product_name.value,
      description: event.currentTarget.description.value,
      price: event.currentTarget.price.value,
      quantity: event.currentTarget.quantity.value,
    };
    setSaving(true);
    setError('');
    try {
      await request(editing ? `/api/products/${formProduct.id}` : '/api/products', {
        method: editing ? 'PUT' : 'POST',
        token,
        body: JSON.stringify(payload),
      });
      setFormProduct(null);
      await loadProducts();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete ${product.product_name}? This cannot be undone.`)) return;
    setError('');
    try {
      await request(`/api/products/${product.id}`, { method: 'DELETE', token });
      setProducts((items) => items.filter((item) => Number(item.id) !== Number(product.id)));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const filteredProducts = products.filter((product) =>
    `${product.product_name} ${product.description || ''}`.toLowerCase().includes(search.toLowerCase()),
  );
  const inventoryCount = products.reduce((total, product) => total + Number(product.quantity || 0), 0);
  const inventoryValue = products.reduce((total, product) => total + Number(product.price || 0) * Number(product.quantity || 0), 0);
  const isAdmin = role === 'admin';

  if (!token) {
    return (
      <main className="login-page">
        <div className="login-aside">
          <p className="brand-mark">GOODS<span>PRODUCT</span></p>
          <div className="aside-copy">
            <p className="eyebrow"></p>
            <h1>Good things,<br /><em>in good order.</em></h1>
            <p></p>
          </div>
          <p className="aside-foot"></p>
        </div>
        <section className="login-main" aria-labelledby="login-heading">
          <form className="login-form" onSubmit={handleLogin}>
            <p className="eyebrow"></p>
            <h2 id="login-heading">Welcome back.</h2>
            <p className="form-intro">Sign in to manage the product catalogue.</p>
            {error && <p className="notice error-notice" role="alert">{error}</p>}
            <label htmlFor="username">Username</label>
            <input id="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <button className="primary-button login-button" type="submit" disabled={saving}>{saving ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <footer className="login-footer">PRODUCT OPERATIONS <span>·</span> LAVALUST API</footer>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand-mark" href="#top" aria-label="Common Goods home">COMMON<span>GOODS</span></a>
        <div className="account-tools"><span className="account-name">{user} · {role}</span><button className="text-button" onClick={() => signOut()}>Log out</button></div>
      </header>

      <section className="dashboard" id="top">
        <div className="page-heading">
          <div><p className="eyebrow"></p><h1>Products</h1></div>
          {isAdmin && <button className="primary-button add-button" onClick={() => setFormProduct({})}><span aria-hidden="true">+</span> Add product</button>}
        </div>

        <div className="stats-row" aria-label="Inventory summary">
          <div className="stat"><span>Listed products</span><strong>{products.length.toString().padStart(2, '0')}</strong></div>
          <div className="stat"><span>Units in stock</span><strong>{inventoryCount.toLocaleString()}</strong></div>
          <div className="stat"><span>Stock value</span><strong>{money.format(inventoryValue)}</strong></div>
        </div>

        {error && <p className="notice error-notice" role="alert">{error}</p>}
        <div className="catalogue-toolbar">
          <div><h2>All products</h2><p>{filteredProducts.length} shown <span>·</span> Updated catalogue</p></div>
          <label className="search-box"><span aria-hidden="true">⌕</span><input aria-label="Search products" placeholder="Search products" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        </div>

        <div className="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Description</th><th>Price</th><th>Quantity</th><th>Added</th>{isAdmin && <th><span className="sr-only">Actions</span></th>}</tr></thead>
            <tbody>
              {loading ? <tr><td className="table-message" colSpan={isAdmin ? 6 : 5}>Loading catalogue…</td></tr> : filteredProducts.length ? filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td><strong className="product-name">{product.product_name}</strong><span className="product-sku">ID {String(product.id).padStart(4, '0')}</span></td>
                  <td className="description-cell">{product.description || '—'}</td>
                  <td className="price-cell">{money.format(Number(product.price))}</td>
                  <td><span className={`quantity ${Number(product.quantity) <= 5 ? 'low-stock' : ''}`}>{product.quantity} <small>units</small></span></td>
                  <td className="date-cell">{product.created_at ? new Date(product.created_at).toLocaleDateString('en-PH', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                  {isAdmin && <td className="row-actions"><button className="text-button" onClick={() => setFormProduct(product)}>Edit</button><button className="text-button delete-action" onClick={() => deleteProduct(product)}>Delete</button></td>}
                </tr>
              )) : <tr><td className="table-message" colSpan={isAdmin ? 6 : 5}>{search ? 'No products match that search.' : isAdmin ? 'Your catalogue is empty. Add the first product to get started.' : 'There are no products to display.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <footer className="table-footer"><span>COMMON GOODS INVENTORY</span><span>{products.length} {products.length === 1 ? 'record' : 'records'}</span></footer>
      </section>

      {isAdmin && formProduct && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormProduct(null); }}>
        <section className="product-dialog" role="dialog" aria-modal="true" aria-labelledby="product-dialog-title">
          <div className="dialog-heading"><div><p className="eyebrow">Catalogue entry</p><h2 id="product-dialog-title">{formProduct.id ? 'Edit product' : 'Add a product'}</h2></div><button className="close-button" aria-label="Close form" onClick={() => setFormProduct(null)}>×</button></div>
          <form className="product-form" onSubmit={saveProduct}>
            <label htmlFor="product_name">Product name</label><input id="product_name" name="product_name" maxLength="100" defaultValue={formProduct.product_name || ''} required autoFocus />
            <label htmlFor="description">Description <span>Optional</span></label><textarea id="description" name="description" rows="3" defaultValue={formProduct.description || ''} />
            <div className="field-pair"><div><label htmlFor="price">Price (PHP)</label><input id="price" name="price" type="number" min="0" max="99999999.99" step="0.01" defaultValue={formProduct.price || ''} required /></div><div><label htmlFor="quantity">Quantity</label><input id="quantity" name="quantity" type="number" min="0" step="1" defaultValue={formProduct.quantity ?? 0} required /></div></div>
            {error && <p className="notice error-notice" role="alert">{error}</p>}
            <div className="dialog-actions"><button className="text-button" type="button" onClick={() => setFormProduct(null)}>Cancel</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : formProduct.id ? 'Save changes' : 'Add product'}</button></div>
          </form>
        </section>
      </div>}
    </main>
  );
}

export default App;