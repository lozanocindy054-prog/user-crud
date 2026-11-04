import React, { useEffect, useMemo, useState } from 'react';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
  IonToast,
} from '@ionic/react';

import {
  searchOutline,
  createOutline,
  trashOutline,
  layersOutline,
  closeOutline,
  cubeOutline,
} from 'ionicons/icons';

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  type DocumentData,
  type QuerySnapshot,
  type FirestoreError,
} from 'firebase/firestore';

import { db, productsCol } from '../../firebase/firebaseConfig';
import './ProductList.css';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  image?: string;
  createdAt?: string;
}

interface Category {
  id: string;
  name: string;
}

// Compress the image before saving it to Firestore.
const compressProductImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Unable to read the selected image.'));
    };

    reader.onload = () => {
      const image = new Image();

      image.onerror = () => {
        reject(new Error('The selected file is not a valid image.'));
      };

      image.onload = () => {
        const maxDimension = 900;

        const scale = Math.min(
          1,
          maxDimension / Math.max(image.width, image.height),
        );

        const canvas = document.createElement('canvas');

        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext('2d');

        if (!context) {
          reject(new Error('Unable to process the selected image.'));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        let quality = 0.78;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        while (dataUrl.length > 650000 && quality > 0.35) {
          quality -= 0.08;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        if (dataUrl.length > 700000) {
          reject(
            new Error('Image is too large. Please choose a smaller image.'),
          );
          return;
        }

        resolve(dataUrl);
      };

      image.src = String(reader.result);
    };

    reader.readAsDataURL(file);
  });
};

const ProductList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productPrice, setProductPrice] = useState<number | null>(null);
  const [productQuantity, setProductQuantity] = useState<number | null>(null);

  // IMAGE EDITING STATES
  const [editImage, setEditImage] = useState('');
  const [imageLoading, setImageLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState<'success' | 'danger'>(
    'success',
  );

  const showMessage = (
    message: string,
    color: 'success' | 'danger' = 'success',
  ) => {
    setToastMessage(message);
    setToastColor(color);
    setShowToast(true);
  };

  // REAL-TIME PRODUCTS
  useEffect(() => {
    const unsubscribe = onSnapshot(
      productsCol,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const productList: Product[] = snapshot.docs.map((item) => {
          const data = item.data();

          let createdAt = '';

          if (data.createdAt?.toDate) {
            createdAt = data.createdAt.toDate().toISOString();
          } else if (typeof data.createdAt === 'string') {
            createdAt = data.createdAt;
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

        productList.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

          return dateB - dateA;
        });

        setProducts(productList);
        setLoading(false);
      },
      (error: FirestoreError) => {
        console.error('Error loading products:', error);
        setLoading(false);
        showMessage(
          'Failed to load products. Check your connection.',
          'danger',
        );
      },
    );

    return () => unsubscribe();
  }, []);

  // REAL-TIME CATEGORIES
  useEffect(() => {
    const categoriesCol = collection(db, 'categories');

    const unsubscribe = onSnapshot(
      categoriesCol,
      (snapshot) => {
        const categoryList = snapshot.docs
          .map((item) => ({
            id: item.id,
            name: String(item.data().name ?? '').trim(),
          }))
          .filter((category) => category.name !== '')
          .sort((a, b) => a.name.localeCompare(b.name));

        setCategories(categoryList);
      },
      (error) => {
        console.error('Error loading categories:', error);
      },
    );

    return () => unsubscribe();
  }, []);

  // CATEGORY OPTIONS
  const categoryOptions = useMemo(() => {
    const names = new Set<string>();

    categories.forEach((category) => names.add(category.name));

    products.forEach((product) => {
      if (product.category.trim()) {
        names.add(product.category.trim());
      }
    });

    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [categories, products]);

  // SEARCH AND FILTER
  const filteredProducts = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(search) ||
        product.category.toLowerCase().includes(search);

      const matchesCategory =
        selectedCategory === 'All' ||
        product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchText, selectedCategory]);

  // SUMMARY CARDS
  const totalProducts = products.length;

  const totalUnits = products.reduce(
    (total, product) => total + product.quantity,
    0,
  );

  const lowStock = products.filter(
    (product) => product.quantity > 0 && product.quantity <= 10,
  ).length;

  const outOfStock = products.filter(
    (product) => product.quantity <= 0,
  ).length;

  // OPEN EDIT MODAL
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setProductName(product.name);
    setProductCategory(product.category);
    setProductPrice(product.price);
    setProductQuantity(product.quantity);

    // SHOW THE CURRENT IMAGE IN THE EDIT MODAL
    setEditImage(product.image || '');

    setShowEditModal(true);
  };

  // CLOSE EDIT MODAL
  const closeEditModal = () => {
    if (saving || imageLoading) return;

    setShowEditModal(false);
    setEditingProduct(null);
    setProductName('');
    setProductCategory('');
    setProductPrice(null);
    setProductQuantity(null);
    setEditImage('');
  };

  // SELECT A NEW IMAGE
  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showMessage('Please select an image file.', 'danger');
      input.value = '';
      return;
    }

    setImageLoading(true);

    try {
      const compressedImage = await compressProductImage(file);

      setEditImage(compressedImage);

      showMessage(
        'New image selected. Click Save Changes to apply it.',
        'success',
      );
    } catch (error) {
      console.error('Image processing error:', error);

      showMessage(
        error instanceof Error
          ? error.message
          : 'Unable to process the selected image.',
        'danger',
      );
    } finally {
      setImageLoading(false);
      input.value = '';
    }
  };

  // UPDATE PRODUCT INCLUDING IMAGE
  const saveChanges = async () => {
    if (!editingProduct || saving || imageLoading) return;

    const name = productName.trim();

    if (!name) {
      showMessage('Product name is required.', 'danger');
      return;
    }

    if (!productCategory.trim()) {
      showMessage('Please select a category.', 'danger');
      return;
    }

    if (
      productPrice === null ||
      !Number.isFinite(productPrice) ||
      productPrice < 0
    ) {
      showMessage('Enter a valid price of 0 or higher.', 'danger');
      return;
    }

    if (
      productQuantity === null ||
      !Number.isInteger(productQuantity) ||
      productQuantity < 0
    ) {
      showMessage(
        'Quantity must be a whole number of 0 or higher.',
        'danger',
      );
      return;
    }

    setSaving(true);

    try {
      await updateDoc(doc(productsCol, editingProduct.id), {
        name,
        category: productCategory,
        price: productPrice,
        quantity: productQuantity,

        // SAVE THE NEW IMAGE OR EMPTY STRING IF REMOVED
        image: editImage,
      });

      setShowEditModal(false);
      setEditingProduct(null);
      setProductName('');
      setProductCategory('');
      setProductPrice(null);
      setProductQuantity(null);
      setEditImage('');

      showMessage('Product updated successfully.');
    } catch (error) {
      console.error('Error updating product:', error);

      showMessage(
        'Failed to update product. Please try again.',
        'danger',
      );
    } finally {
      setSaving(false);
    }
  };

  // DELETE PRODUCT
  const deleteProduct = async (product: Product) => {
    if (deletingId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setDeletingId(product.id);

    try {
      await deleteDoc(doc(productsCol, product.id));
      showMessage('Product deleted successfully.');
    } catch (error) {
      console.error('Error deleting product:', error);

      showMessage(
        'Failed to delete product. Please try again.',
        'danger',
      );
    } finally {
      setDeletingId(null);
    }
  };

  // STOCK STATUS
  const getStockStatus = (quantity: number) => {
    if (quantity <= 0) {
      return { label: 'Out of Stock', className: 'out-of-stock' };
    }

    if (quantity <= 10) {
      return { label: 'Low Stock', className: 'low-stock' };
    }

    return { label: 'In Stock', className: 'in-stock' };
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="product-list-main-toolbar">
          <IonTitle>Product List</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="product-list-content">
        <div className="product-list-page">
          {/* PAGE HEADER */}
          <section className="product-list-heading">
            <div>
              <span className="product-list-eyebrow">
                INVENTORY / PRODUCT LIST
              </span>

              <h1>Product List</h1>

              <p>
                View, search, edit, update, and delete your existing products.
              </p>
            </div>
          </section>

          {/* SUMMARY CARDS */}
          <section className="product-list-summary">
            <div className="product-summary-card">
              <div className="product-summary-icon">
                <IonIcon icon={cubeOutline} />
              </div>

              <div>
                <span>Total Products</span>
                <h2>{totalProducts}</h2>
              </div>
            </div>

            <div className="product-summary-card">
              <div className="product-summary-icon">
                <IonIcon icon={layersOutline} />
              </div>

              <div>
                <span>Total Units</span>
                <h2>{totalUnits}</h2>
              </div>
            </div>

            <div className="product-summary-card">
              <div className="product-summary-icon warning-icon">
                <IonIcon icon={cubeOutline} />
              </div>

              <div>
                <span>Low Stock</span>
                <h2>{lowStock}</h2>
              </div>
            </div>

            <div className="product-summary-card">
              <div className="product-summary-icon danger-icon">
                <IonIcon icon={cubeOutline} />
              </div>

              <div>
                <span>Out of Stock</span>
                <h2>{outOfStock}</h2>
              </div>
            </div>
          </section>

          {/* PRODUCTS TABLE */}
          <section className="product-list-panel">
            <div className="product-list-toolbar">
              <div className="product-list-toolbar-title">
                <h2>All Products</h2>
                <p>Manage your existing product records.</p>
              </div>

              <div className="product-list-filters">
                <div className="product-list-search">
                  <IonIcon icon={searchOutline} />

                  <IonInput
                    value={searchText}
                    placeholder="Search products..."
                    aria-label="Search products"
                    onIonInput={(event) =>
                      setSearchText(event.detail.value ?? '')
                    }
                  />
                </div>

                <IonSelect
                  className="product-list-category-filter"
                  value={selectedCategory}
                  placeholder="All Categories"
                  aria-label="Filter by category"
                  interface="popover"
                  onIonChange={(event) =>
                    setSelectedCategory(event.detail.value ?? 'All')
                  }
                >
                  <IonSelectOption value="All">
                    All Categories
                  </IonSelectOption>

                  {categoryOptions.map((category) => (
                    <IonSelectOption key={category} value={category}>
                      {category}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </div>
            </div>

            {loading ? (
              <div className="product-list-loading">
                <IonSpinner name="crescent" />
                <p>Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="product-list-empty">
                <IonIcon icon={cubeOutline} />

                <h3>
                  {products.length === 0
                    ? 'No products yet'
                    : 'No matching products'}
                </h3>

                <p>
                  {products.length === 0
                    ? 'Products you have already added will appear here.'
                    : 'Try another search term or choose a different category.'}
                </p>

                {products.length > 0 && (
                  <IonButton
                    fill="outline"
                    className="product-reset-filter-button"
                    onClick={() => {
                      setSearchText('');
                      setSelectedCategory('All');
                    }}
                  >
                    Clear Search and Filter
                  </IonButton>
                )}
              </div>
            ) : (
              <div className="product-list-table-wrap">
                <table className="product-list-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Quantity</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProducts.map((product) => {
                      const status = getStockStatus(product.quantity);

                      return (
                        <tr key={product.id}>
                          <td>
                            <div className="product-list-name">
                              {product.image ? (
                                <img
                                  src={product.image}
                                  alt={product.name || 'Product image'}
                                  className="product-list-image"
                                  onError={(event) => {
                                    event.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="product-row-icon">
                                  <IonIcon icon={cubeOutline} />
                                </div>
                              )}

                              <div className="product-list-product-details">
                                <strong>
                                  {product.name || 'Unnamed Product'}
                                </strong>

                                <span>
                                  Product ID: {product.id.slice(0, 8)}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="product-category-tag">
                              {product.category}
                            </span>
                          </td>

                          <td className="product-price">
                            ₱
                            {product.price.toLocaleString('en-PH', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>

                          <td>{product.quantity}</td>

                          <td>
                            <span
                              className={`product-stock-status ${status.className}`}
                            >
                              <span className="status-dot" />
                              {status.label}
                            </span>
                          </td>

                          <td>
                            <div className="product-list-actions">
                              <IonButton
                                className="product-edit-button"
                                fill="solid"
                                size="small"
                                disabled={deletingId === product.id || saving}
                                aria-label={`Edit ${product.name}`}
                                onClick={() => openEditModal(product)}
                              >
                                <IonIcon icon={createOutline} slot="start" />
                                Edit
                              </IonButton>

                              <IonButton
                                className="product-delete-button"
                                fill="solid"
                                size="small"
                                disabled={deletingId !== null || saving}
                                aria-label={`Delete ${product.name}`}
                                onClick={() => deleteProduct(product)}
                              >
                                {deletingId === product.id ? (
                                  <IonSpinner name="crescent" />
                                ) : (
                                  <>
                                    <IonIcon
                                      icon={trashOutline}
                                      slot="start"
                                    />
                                    Delete
                                  </>
                                )}
                              </IonButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="product-list-footer">
              <span>
                Showing <strong>{filteredProducts.length}</strong> of{' '}
                <strong>{products.length}</strong> products
              </span>

              <IonButton
                fill="clear"
                size="small"
                className="product-clear-filter"
                onClick={() => {
                  setSearchText('');
                  setSelectedCategory('All');
                }}
                disabled={!searchText && selectedCategory === 'All'}
              >
                Clear filters
              </IonButton>
            </div>
          </section>
        </div>

        {/* EDIT PRODUCT MODAL */}
        <IonModal
          isOpen={showEditModal}
          onDidDismiss={() => {
            if (!saving && !imageLoading) {
              setShowEditModal(false);
              setEditingProduct(null);
              setProductName('');
              setProductCategory('');
              setProductPrice(null);
              setProductQuantity(null);
              setEditImage('');
            }
          }}
        >
          <IonHeader>
            <IonToolbar className="product-list-modal-toolbar">
              <IonTitle>Edit Product</IonTitle>

              <IonButton
                slot="end"
                fill="clear"
                className="product-modal-close"
                onClick={closeEditModal}
                disabled={saving || imageLoading}
                aria-label="Close edit modal"
              >
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonToolbar>
          </IonHeader>

          <IonContent className="product-list-modal-content">
            <div className="product-list-edit-form">
              <div className="product-edit-intro">
                <div className="product-edit-intro-icon">
                  <IonIcon icon={createOutline} />
                </div>

                <div>
                  <h2>Update Product Details</h2>
                  <p>Change the product information and image below.</p>
                </div>
              </div>

              {/* EDIT IMAGE */}
              <div className="product-edit-image-section">
                <IonLabel className="product-edit-image-label">
                  Product Image
                </IonLabel>

                <div className="product-edit-image-preview-wrap">
                  {editImage ? (
                    <img
                      src={editImage}
                      alt="Product preview"
                      className="product-edit-image-preview"
                    />
                  ) : (
                    <div className="product-edit-image-placeholder">
                      <IonIcon icon={cubeOutline} />
                      <span>No image selected</span>
                    </div>
                  )}
                </div>

                <label className="product-edit-image-upload">
                  <IonIcon icon={createOutline} />

                  <span>
                    {imageLoading ? 'Processing image...' : 'Choose New Image'}
                  </span>

                  <input
                    type="file"
                    accept="image/*"
                    disabled={saving || imageLoading}
                    onChange={handleImageChange}
                  />
                </label>

                {editImage && (
                  <IonButton
                    fill="clear"
                    size="small"
                    className="product-edit-remove-image"
                    disabled={saving || imageLoading}
                    onClick={() => setEditImage('')}
                  >
                    <IonIcon icon={trashOutline} slot="start" />
                    Remove image
                  </IonButton>
                )}

                <p className="product-edit-image-help">
                  Choose a new picture from your computer. Click Save Changes
                  to update the product.
                </p>
              </div>

              {/* PRODUCT NAME */}
              <IonItem>
                <IonLabel position="stacked">Product Name</IonLabel>

                <IonInput
                  value={productName}
                  placeholder="Enter product name"
                  onIonInput={(event) =>
                    setProductName(event.detail.value ?? '')
                  }
                />
              </IonItem>

              {/* CATEGORY */}
              <IonItem>
                <IonLabel position="stacked">Category</IonLabel>

                <IonSelect
                  value={productCategory}
                  placeholder="Select category"
                  interface="popover"
                  onIonChange={(event) =>
                    setProductCategory(event.detail.value ?? '')
                  }
                >
                  {categoryOptions.map((category) => (
                    <IonSelectOption key={category} value={category}>
                      {category}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>

              {/* PRICE */}
              <IonItem>
                <IonLabel position="stacked">Price (₱)</IonLabel>

                <IonInput
                  type="number"
                  min="0"
                  value={productPrice}
                  placeholder="Enter price"
                  onIonInput={(event) => {
                    const value = event.detail.value;

                    setProductPrice(
                      value === '' || value === undefined
                        ? null
                        : Number(value),
                    );
                  }}
                />
              </IonItem>

              {/* QUANTITY */}
              <IonItem>
                <IonLabel position="stacked">Quantity</IonLabel>

                <IonInput
                  type="number"
                  min="0"
                  step="1"
                  value={productQuantity}
                  placeholder="Enter quantity"
                  onIonInput={(event) => {
                    const value = event.detail.value;

                    setProductQuantity(
                      value === '' || value === undefined
                        ? null
                        : Number(value),
                    );
                  }}
                />
              </IonItem>

              {/* FORM BUTTONS */}
              <div className="product-list-form-actions">
                <IonButton
                  expand="block"
                  fill="outline"
                  onClick={closeEditModal}
                  disabled={saving || imageLoading}
                >
                  Cancel
                </IonButton>

                <IonButton
                  expand="block"
                  className="product-save-button"
                  onClick={saveChanges}
                  disabled={saving || imageLoading}
                >
                  {saving || imageLoading ? (
                    <>
                      <IonSpinner name="crescent" />
                      <span className="product-saving-text">
                        {imageLoading ? 'Processing image...' : 'Saving...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <IonIcon icon={createOutline} slot="start" />
                      Save Changes
                    </>
                  )}
                </IonButton>
              </div>
            </div>
          </IonContent>
        </IonModal>

        {/* SUCCESS / ERROR MESSAGE */}
        <IonToast
          isOpen={showToast}
          message={toastMessage}
          color={toastColor}
          duration={2800}
          position="bottom"
          onDidDismiss={() => setShowToast(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default ProductList;