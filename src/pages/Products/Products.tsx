
import React, { useEffect, useMemo, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonIcon,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonButton,
  IonModal,
  IonInput,
  IonItem,
  IonLabel,
  IonButtons,
  IonToast,
} from '@ionic/react';

import {
  cubeOutline,
  searchOutline,
  layersOutline,
  cashOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  addOutline,
  closeOutline,
  imageOutline,
} from 'ionicons/icons';

import {
  addDoc,
  onSnapshot,
  type QuerySnapshot,
  type DocumentData,
  type FirestoreError,
} from 'firebase/firestore';

import { productsCol } from '../../firebase/firebaseConfig';
import './Products.css';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  image?: string;
  createdAt?: string;
}

interface ProductForm {
  name: string;
  category: string;
  price: string;
  quantity: string;
  image: string;
}

const categories = [
  'Electronics',
  'Food & Beverages',
  'Clothing',
  'Home & Kitchen',
  'School Supplies',
  'Personal Care',
  'Other',
];

const emptyForm: ProductForm = {
  name: '',
  category: 'Electronics',
  price: '',
  quantity: '',
  image: '',
};

const fallbackProductImage =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">
      <rect width="160" height="160" rx="18" fill="#eef5ed"/>
      <g fill="none" stroke="#6b9568" stroke-width="5">
        <rect x="43" y="35" width="74" height="76" rx="8"/>
        <circle cx="67" cy="58" r="8"/>
        <path d="M49 98l22-22 14 13 12-11 14 20"/>
      </g>
      <text x="80" y="139" font-size="10" text-anchor="middle"
        fill="#52734f">NO IMAGE</text>
    </svg>
  `);

const formatCurrency = (amount: number) =>
  amount.toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  });

const getProductImage = (product: Product) =>
  product.image || fallbackProductImage;

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState<
    'success' | 'danger'
  >('success');

  const notify = (
    message: string,
    color: 'success' | 'danger' = 'success'
  ) => {
    setToastMessage(message);
    setToastColor(color);
  };

  // Load products from Firebase in real time.
  useEffect(() => {
    const unsubscribe = onSnapshot(
      productsCol,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const items: Product[] = snapshot.docs.map((item) => {
          const data = item.data();
          let createdAt = '';

          if (typeof data.createdAt === 'string') {
            createdAt = data.createdAt;
          } else if (
            data.createdAt &&
            typeof data.createdAt.toDate === 'function'
          ) {
            createdAt = data.createdAt.toDate().toISOString();
          }

          return {
            id: item.id,
            name: String(data.name ?? ''),
            category: String(data.category ?? 'Other'),
            price: Number(data.price ?? 0),
            quantity: Number(data.quantity ?? 0),
            image: typeof data.image === 'string' ? data.image : '',
            createdAt,
          };
        });

        items.sort((a, b) =>
          (b.createdAt || '').localeCompare(a.createdAt || '')
        );

        setProducts(items);
        setLoading(false);
      },
      (error: FirestoreError) => {
        console.error('Error loading products:', error);
        notify(
          'Hindi ma-load ang products. I-check ang Firebase settings.',
          'danger'
        );
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Search and category filtering.
  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(keyword) ||
        product.category.toLowerCase().includes(keyword);

      const matchesCategory =
        categoryFilter === 'all' ||
        product.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  // Inventory statistics.
  const totalValue = products.reduce(
    (total, product) => total + product.price * product.quantity,
    0
  );

  const lowStockCount = products.filter(
    (product) => product.quantity > 0 && product.quantity <= 10
  ).length;

  const outOfStockCount = products.filter(
    (product) => product.quantity <= 0
  ).length;

  const getStockStatus = (quantity: number) => {
    if (quantity <= 0) {
      return { label: 'Out of Stock', className: 'out' };
    }

    if (quantity <= 10) {
      return { label: 'Low Stock', className: 'low' };
    }

    return { label: 'In Stock', className: 'available' };
  };

  const updateForm = (
    field: keyof ProductForm,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  // Select and compress product picture.
  const handlePictureChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify('Pumili ng valid na image file.', 'danger');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notify('Maximum 5 MB lang ang original picture.', 'danger');
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      notify('Hindi mabasa ang picture. Subukan ulit.', 'danger');
    };

    reader.onload = () => {
      const image = new Image();

      image.onerror = () => {
        notify('Hindi ma-open ang picture file.', 'danger');
      };

      image.onload = () => {
        const maxDimension = 360;
        const scale = Math.min(
          1,
          maxDimension / Math.max(image.width, image.height)
        );

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext('2d');

        if (!context) {
          notify('Hindi ma-process ang picture.', 'danger');
          return;
        }

        context.drawImage(
          image,
          0,
          0,
          canvas.width,
          canvas.height
        );

        const compressedImage = canvas.toDataURL('image/jpeg', 0.58);

        if (compressedImage.length > 700000) {
          notify(
            'Masyadong malaki ang image pagkatapos i-compress.',
            'danger'
          );
          return;
        }

        updateForm('image', compressedImage);
        notify('Nagdagdag na ang picture. I-save ang product.');
      };

      image.src = String(reader.result);
    };

    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setForm({ ...emptyForm });
  };

  const closeModal = () => {
    if (saving) return;

    setShowAddModal(false);
    resetForm();
  };

  // Save a new product to Firestore.
  const handleSaveProduct = async () => {
    const name = form.name.trim();
    const price = Number(form.price);
    const quantity = Number(form.quantity);

    if (!name) {
      notify('Ilagay ang pangalan ng product.', 'danger');
      return;
    }

    if (
      form.price.trim() === '' ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      notify('Maglagay ng valid na price.', 'danger');
      return;
    }

    if (
      form.quantity.trim() === '' ||
      !Number.isInteger(quantity) ||
      quantity < 0
    ) {
      notify(
        'Maglagay ng whole number na quantity na 0 o mas mataas.',
        'danger'
      );
      return;
    }

    setSaving(true);

    try {
      await addDoc(productsCol, {
        name,
        category: form.category,
        price,
        quantity,
        image: form.image,
        createdAt: new Date().toISOString(),
      });

      setShowAddModal(false);
      resetForm();
      notify('Matagumpay na naidagdag ang product!');
    } catch (error) {
      console.error('Error saving product:', error);
      notify(
        'Hindi na-save ang product. I-check ang internet, Firebase config, at Firestore rules.',
        'danger'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonPage className="products-page">
      {/* HEADER: StockWise brand only; Add Product removed here. */}
      <IonHeader className="products-header">
        <IonToolbar>
          <div className="products-toolbar">
            <div className="products-brand">
              <div className="brand-icon">
                <IonIcon icon={cubeOutline} />
              </div>

              <div>
                <h1>StockWise</h1>
                <p>Product Inventory</p>
              </div>
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="products-content">
        <div className="products-container">
          {/* Page title */}
          <section className="products-intro">
            <div>
              <p className="eyebrow">INVENTORY MANAGEMENT</p>
              <h2>Products</h2>
              <p className="intro-description">
                Manage your products, prices, and stock levels.
              </p>
            </div>

            {/* Mobile Add Product button */}
            <IonButton
              className="mobile-add-button"
              onClick={() => setShowAddModal(true)}
              type="button"
            >
              <IonIcon icon={addOutline} slot="start" />
              Add Product
            </IonButton>
          </section>

          {/* Inventory statistics */}
          <section className="product-stats">
            <div className="stat-card">
              <div className="stat-icon green">
                <IonIcon icon={cubeOutline} />
              </div>
              <div>
                <p>Total Products</p>
                <h3>{products.length}</h3>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon blue">
                <IonIcon icon={cashOutline} />
              </div>
              <div>
                <p>Total Inventory Value</p>
                <h3>{formatCurrency(totalValue)}</h3>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon orange">
                <IonIcon icon={alertCircleOutline} />
              </div>
              <div>
                <p>Low Stock</p>
                <h3>{lowStockCount}</h3>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon red">
                <IonIcon icon={layersOutline} />
              </div>
              <div>
                <p>Out of Stock</p>
                <h3>{outOfStockCount}</h3>
              </div>
            </div>
          </section>

          {/* Product list */}
          <section className="products-panel">
            <div className="panel-heading">
              <div>
                <h3>Product List</h3>
                <p>View and search your inventory.</p>
              </div>

              {/* Add Product remains here */}
              <IonButton
                className="add-product-button panel-add-button"
                onClick={() => setShowAddModal(true)}
                type="button"
              >
                <IonIcon icon={addOutline} slot="start" />
                Add Product
              </IonButton>
            </div>

            {/* Search and category filter */}
            <div className="product-filters">
              <div className="search-wrapper">
                <IonSearchbar
                  value={search}
                  onIonInput={(event) =>
                    setSearch(event.detail.value ?? '')
                  }
                  placeholder="Search products..."
                  debounce={150}
                  className="product-search"
                />
              </div>

              <div className="category-wrapper">
                <IonSelect
                  value={categoryFilter}
                  onIonChange={(event) =>
                    setCategoryFilter(event.detail.value)
                  }
                  interface="popover"
                  className="category-select"
                  aria-label="Filter by category"
                >
                  <IonSelectOption value="all">
                    All Categories
                  </IonSelectOption>

                  {categories.map((category) => (
                    <IonSelectOption
                      key={category}
                      value={category}
                    >
                      {category}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </div>
            </div>

            {loading ? (
              <div className="products-loading">
                <IonSpinner name="crescent" />
                <p>Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="products-empty">
                <div className="empty-icon">
                  <IonIcon icon={searchOutline} />
                </div>

                <h3>
                  {products.length === 0
                    ? 'No products yet'
                    : 'No matching products'}
                </h3>

                <p>
                  {products.length === 0
                    ? 'Click Add Product to add your first item.'
                    : 'Try another product name or category.'}
                </p>

                {products.length === 0 && (
                  <IonButton
                    className="add-product-button"
                    onClick={() => setShowAddModal(true)}
                    type="button"
                  >
                    <IonIcon icon={addOutline} slot="start" />
                    Add Your First Product
                  </IonButton>
                )}
              </div>
            ) : (
              <div className="products-table-wrap">
                <table className="products-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Quantity</th>
                      <th>Stock Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProducts.map((product) => {
                      const status = getStockStatus(product.quantity);

                      return (
                        <tr key={product.id}>
                          <td>
                            <div className="product-cell">
                              <img
                                className="product-image"
                                src={getProductImage(product)}
                                alt={product.name}
                                onError={(event) => {
                                  event.currentTarget.onerror = null;
                                  event.currentTarget.src =
                                    fallbackProductImage;
                                }}
                              />

                              <div className="product-name">
                                <strong>{product.name}</strong>
                                <span>
                                  ID: {product.id.slice(0, 8)}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="category-tag">
                              {product.category}
                            </span>
                          </td>

                          <td className="price-cell">
                            {formatCurrency(product.price)}
                          </td>

                          <td>
                            <span className="quantity-cell">
                              {product.quantity}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`stock-status ${status.className}`}
                            >
                              <span className="status-dot" />
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="products-footer">
            <IonIcon icon={checkmarkCircleOutline} />
            Inventory updates automatically through Firebase.
          </p>
        </div>

        {/* Add Product modal */}
        <IonModal
          isOpen={showAddModal}
          onDidDismiss={() => {
            if (!saving) resetForm();
          }}
          className="add-product-modal"
        >
          <div className="modal-container">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">INVENTORY MANAGEMENT</p>
                <h2>Add Product</h2>
                <p>Enter the product information below.</p>
              </div>

              <IonButtons>
                <IonButton
                  fill="clear"
                  className="close-modal-button"
                  onClick={closeModal}
                  disabled={saving}
                  aria-label="Close modal"
                >
                  <IonIcon icon={closeOutline} />
                </IonButton>
              </IonButtons>
            </div>

            <div className="product-form">
              <div className="form-field">
                <IonLabel>Product Name *</IonLabel>
                <IonItem className="form-input-item">
                  <IonInput
                    value={form.name}
                    placeholder="e.g. Wireless Mouse"
                    onIonInput={(event) =>
                      updateForm('name', event.detail.value ?? '')
                    }
                    maxlength={100}
                  />
                </IonItem>
              </div>

              <div className="form-field">
                <IonLabel>Category *</IonLabel>
                <IonItem className="form-input-item">
                  <IonSelect
                    value={form.category}
                    onIonChange={(event) =>
                      updateForm('category', event.detail.value)
                    }
                    interface="popover"
                    placeholder="Select category"
                  >
                    {categories.map((category) => (
                      <IonSelectOption
                        key={category}
                        value={category}
                      >
                        {category}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
              </div>

              <div className="form-two-columns">
                <div className="form-field">
                  <IonLabel>Price (₱) *</IonLabel>
                  <IonItem className="form-input-item">
                    <IonInput
                      type="number"
                      inputmode="decimal"
                      min="0"
                      step="0.01"
                      value={form.price}
                      placeholder="0.00"
                      onIonInput={(event) =>
                        updateForm('price', event.detail.value ?? '')
                      }
                    />
                  </IonItem>
                </div>

                <div className="form-field">
                  <IonLabel>Quantity *</IonLabel>
                  <IonItem className="form-input-item">
                    <IonInput
                      type="number"
                      inputmode="numeric"
                      min="0"
                      step="1"
                      value={form.quantity}
                      placeholder="0"
                      onIonInput={(event) =>
                        updateForm('quantity', event.detail.value ?? '')
                      }
                    />
                  </IonItem>
                </div>
              </div>

              <div className="form-field">
                <IonLabel>Product Picture</IonLabel>

                <div className="picture-upload-area">
                  {form.image ? (
                    <img
                      src={form.image}
                      alt="Product preview"
                      className="picture-preview"
                    />
                  ) : (
                    <div className="picture-placeholder">
                      <IonIcon icon={imageOutline} />
                      <span>No picture selected</span>
                    </div>
                  )}

                  <label className="picture-upload-button">
                    <IonIcon icon={imageOutline} />
                    {form.image ? 'Change Picture' : 'Choose Picture'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePictureChange}
                      disabled={saving}
                    />
                  </label>

                  {form.image && (
                    <button
                      type="button"
                      className="remove-picture-button"
                      onClick={() => updateForm('image', '')}
                      disabled={saving}
                    >
                      Remove picture
                    </button>
                  )}

                  <p className="picture-help">
                    Maximum original file size: 5 MB. The image is
                    compressed before saving.
                  </p>
                </div>
              </div>

              <div className="form-note">
                <IonIcon icon={alertCircleOutline} />
                <p>
                  The picture is saved in the Firestore product document,
                  not in Firebase Storage.
                </p>
              </div>

              <div className="modal-actions">
                <IonButton
                  fill="outline"
                  className="cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </IonButton>

                <IonButton
                  className="save-product-button"
                  onClick={handleSaveProduct}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <IonSpinner name="crescent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <IonIcon icon={addOutline} slot="start" />
                      Save Product
                    </>
                  )}
                </IonButton>
              </div>
            </div>
          </div>
        </IonModal>

        <IonToast
          isOpen={toastMessage !== ''}
          message={toastMessage}
          color={toastColor}
          duration={3000}
          position="top"
          onDidDismiss={() => setToastMessage('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default Products;
