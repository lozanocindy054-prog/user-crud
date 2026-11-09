
import React, { useEffect, useState } from 'react';

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonIcon,
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonSpinner,
} from '@ionic/react';

import {
  leafOutline,
  cubeOutline,
  layersOutline,
  cashOutline,
  arrowForwardOutline,
  alertCircleOutline,
} from 'ionicons/icons';

import { onSnapshot } from 'firebase/firestore';
import { productsCol } from '../../firebase/firebaseConfig';

import './Dashboard.css';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  image: string;
}

const formatCurrency = (amount: number): string =>
  amount.toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  });

const Dashboard: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      productsCol,
      (snapshot) => {
        const productList: Product[] = snapshot.docs.map((document) => {
          const data = document.data();

          return {
            id: document.id,
            name: String(data.name ?? ''),
            category: String(data.category ?? ''),
            price: Number(data.price ?? 0),
            quantity: Number(data.quantity ?? 0),
            image: typeof data.image === 'string' ? data.image : '',
          };
        });

        setProducts(productList);
        setLoading(false);
        setError('');
      },
      (firebaseError) => {
        console.error('Failed to load products:', firebaseError);

        setError(
          'Unable to load inventory. Please check your internet connection and Firebase permissions.'
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const totalProducts = products.length;

  const totalQuantity = products.reduce(
    (total, product) => total + product.quantity,
    0
  );

  const totalValue = products.reduce(
    (total, product) => total + product.price * product.quantity,
    0
  );

  const lowStock = products.filter(
    (product) => product.quantity <= 10
  ).length;

  const recentProducts = [...products].slice(0, 8);

  return (
    <IonPage className="dashboard-page">
      <IonHeader className="dashboard-header">
        <IonToolbar className="dashboard-toolbar">
          <div className="brand-container">
            <div className="brand-icon">
              <IonIcon icon={leafOutline} />
            </div>

            <div className="brand-text">
              <h2>StockTrack</h2>
              <span>INVENTORY MANAGEMENT</span>
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="dashboard-content">
        <main className="dashboard-container">

          {/* WELCOME BANNER */}
          <section className="welcome-section">
            <div className="welcome-info">
              <span className="welcome-label">
                INVENTORY OVERVIEW
              </span>

              <h1>Welcome back!</h1>

              <p>
                Monitor your inventory in real time and keep track of your products, stock levels, and overall inventory value.
              </p>
            </div>

            <div className="welcome-decoration" aria-hidden="true">
              <IonIcon icon={cubeOutline} />
            </div>
          </section>

          {/* INVENTORY SUMMARY */}
          <section className="summary-section">
            <div className="section-heading">
              <div>
                <h2>Dashboard Overview</h2>
                <p>Live summary of your inventory</p>
              </div>
            </div>

            <IonGrid className="stats-grid">
              <IonRow>
                <IonCol size="12" sizeSm="6" sizeLg="4">
                  <IonCard className="summary-card">
                    <IonCardContent>
                      <div className="summary-card-top">
                        <div className="summary-icon">
                          <IonIcon icon={cubeOutline} />
                        </div>

                        <span className="summary-chip">
                          Products
                        </span>
                      </div>

                      <p className="summary-label">
                        Total Products
                      </p>

                      <h2 className="summary-value">
                        {loading
                          ? '—'
                          : totalProducts.toLocaleString()}
                      </h2>

                      <p className="summary-description">
                        Registered products
                      </p>
                    </IonCardContent>
                  </IonCard>
                </IonCol>

                <IonCol size="12" sizeSm="6" sizeLg="4">
                  <IonCard className="summary-card">
                    <IonCardContent>
                      <div className="summary-card-top">
                        <div className="summary-icon quantity-icon">
                          <IonIcon icon={layersOutline} />
                        </div>

                        <span className="summary-chip">
                          Stock
                        </span>
                      </div>

                      <p className="summary-label">
                        Total Quantity
                      </p>

                      <h2 className="summary-value">
                        {loading
                          ? '—'
                          : totalQuantity.toLocaleString()}
                      </h2>

                      <p className="summary-description">
                        Total units in stock
                      </p>
                    </IonCardContent>
                  </IonCard>
                </IonCol>

                <IonCol size="12" sizeSm="12" sizeLg="4">
                  <IonCard className="summary-card">
                    <IonCardContent>
                      <div className="summary-card-top">
                        <div className="summary-icon value-icon">
                          <IonIcon icon={cashOutline} />
                        </div>

                        <span className="summary-chip">
                          PHP
                        </span>
                      </div>

                      <p className="summary-label">
                        Inventory Value
                      </p>

                      <h2 className="summary-value value-number">
                        {loading
                          ? '—'
                          : formatCurrency(totalValue)}
                      </h2>

                      <p className="summary-description">
                        Price multiplied by quantity
                      </p>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            </IonGrid>
          </section>

          {/* PRODUCTS INVENTORY */}
          <section className="recent-section">
            <div className="section-heading recent-heading">
              <div className="recent-heading-info">
                <h2>Products Inventory</h2>

                <p>
                  {loading
                    ? 'Loading products...'
                    : `${totalProducts} product(s) in your inventory`}
                </p>
              </div>

              <IonButton
                className="view-products-button"
                routerLink="/products"
                fill="outline"
              >
                <span>View Products</span>
                <IonIcon slot="end" icon={arrowForwardOutline} />
              </IonButton>
            </div>

            {/* LOADING STATE */}
            {loading && (
              <div className="dashboard-message">
                <IonSpinner name="crescent" />
                <p>Loading inventory...</p>
              </div>
            )}

            {/* ERROR STATE */}
            {!loading && error && (
              <div className="dashboard-message error-message">
                <IonIcon icon={alertCircleOutline} />
                <p>{error}</p>
              </div>
            )}

            {/* INVENTORY TABLE */}
            {!loading && !error && (
              <>
                {products.length === 0 ? (
                  <div className="empty-inventory">
                    <div className="empty-inventory-icon">
                      <IonIcon icon={cubeOutline} />
                    </div>

                    <h3>No products yet</h3>

                    <p>
                      Add your first product on the Products page to
                      see your inventory summary here.
                    </p>

                    <IonButton
                      className="empty-add-button"
                      routerLink="/products"
                    >
                      <IonIcon slot="start" icon={cubeOutline} />
                      Go to Products
                    </IonButton>
                  </div>
                ) : (
                  <div className="inventory-table-wrapper">
                    <table className="inventory-table">
                      <thead>
                        <tr>
                          <th>Product Name</th>
                          <th>Category</th>
                          <th>Price</th>
                          <th>Quantity</th>
                          <th>Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {recentProducts.map((product) => (
                          <tr key={product.id}>
                            <td>
                              <div className="product-name-cell">
                                {product.image ? (
                                  <img
                                    className="product-thumbnail"
                                    src={product.image}
                                    alt={
                                      product.name
                                        ? `${product.name} product`
                                        : 'Product'
                                    }
                                    loading="lazy"
                                    onError={(event) => {
                                      event.currentTarget.style.display =
                                        'none';

                                      event.currentTarget.nextElementSibling
                                        ?.classList.remove('fallback-hidden');
                                    }}
                                  />
                                ) : null}

                                <span
                                  className={`product-mini-icon ${
                                    product.image ? 'fallback-hidden' : ''
                                  }`}
                                >
                                  <IonIcon icon={cubeOutline} />
                                </span>

                                <strong>
                                  {product.name || 'Unnamed Product'}
                                </strong>
                              </div>
                            </td>

                            <td>
                              <span className="dashboard-category">
                                {product.category || 'Uncategorized'}
                              </span>
                            </td>

                            <td className="dashboard-price">
                              {formatCurrency(product.price)}
                            </td>

                            <td className="dashboard-quantity">
                              {product.quantity.toLocaleString()}
                            </td>

                            <td>
                              <span
                                className={
                                  product.quantity <= 0
                                    ? 'stock-status out-of-stock'
                                    : product.quantity <= 10
                                      ? 'stock-status low-stock'
                                      : 'stock-status in-stock'
                                }
                              >
                                <span className="status-dot" />

                                {product.quantity <= 0
                                  ? 'Out of Stock'
                                  : product.quantity <= 10
                                    ? 'Low Stock'
                                    : 'In Stock'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {products.length > recentProducts.length && (
                      <div className="more-products-note">
                        Showing {recentProducts.length} of {totalProducts}{' '}
                        products.

                        <IonButton
                          fill="clear"
                          size="small"
                          routerLink="/products"
                        >
                          View all
                          <IonIcon
                            slot="end"
                            icon={arrowForwardOutline}
                          />
                        </IonButton>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* DASHBOARD FOOTER */}
            {!loading && !error && products.length > 0 && (
              <div className="dashboard-footer">
                <span>
                  <span className="footer-status-dot" />
                  Low-stock products: <strong>{lowStock}</strong>
                </span>

                <span className="footer-updated">
                  Inventory updates in real time
                </span>
              </div>
            )}
          </section>

        </main>
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;
