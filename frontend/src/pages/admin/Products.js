import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatPrice } from '../../utils/priceFormatter';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [oldPrice, setOldPrice] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await api.get('/products?limit=100');
      setProducts(response.data.data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setEditingId(product._id);
    setEditPrice(product.price.toString());
    setOldPrice(product.price.toString());
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditPrice('');
    setOldPrice('');
  };

  const handleSavePrice = async (productId) => {
    if (!editPrice || editPrice <= 0) {
      setMessage('❌ Price must be greater than 0');
      return;
    }

    try {
      const newPrice = parseFloat(editPrice);
      await api.put(`/products/${productId}`, { price: newPrice });
      
      setMessage(`✅ Price updated successfully! (${formatPrice(oldPrice)} → ${formatPrice(newPrice)})`);
      setEditingId(null);
      loadProducts();

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`❌ Error: ${error.response?.data?.message || 'Failed to update price'}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await api.delete(`/products/${id}`);
        loadProducts();
      } catch (error) {
        alert('Error deleting product');
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading products...</div>;
  }

  return (
    <div className="admin-products py-3">
      <div className="container">
        <div className="flex-between mb-2">
          <h1>Manage Products</h1>
          <button className="btn btn-primary">Add New Product</button>
        </div>

        {message && (
          <div className={`alert ${message.includes('✅') ? 'alert-success' : 'alert-danger'} mb-2`}>
            {message}
          </div>
        )}

        <div className="card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id}>
                  <td>{product.name}</td>
                  <td>{product.category}</td>
                  <td>
                    {editingId === product._id ? (
                      <div className="price-edit-inline">
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="price-input"
                          min="0"
                          step="0.01"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <span className="price-display">{formatPrice(product.price)}</span>
                    )}
                  </td>
                  <td>{product.stock}</td>
                  <td>
                    {editingId === product._id ? (
                      <div className="edit-actions">
                        <button
                          className="btn btn-sm btn-success mr-1"
                          onClick={() => handleSavePrice(product._id)}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="normal-actions">
                        <button
                          className="btn btn-sm btn-secondary mr-1"
                          onClick={() => handleEdit(product)}
                          title="Edit price"
                        >
                          ✏️ Price
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(product._id)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .admin-table {
          width: 100%;
          border-collapse: collapse;
        }

        .admin-table th,
        .admin-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid var(--border-color);
        }

        .admin-table th {
          background-color: var(--light-color);
          font-weight: 600;
        }

        .mr-1 {
          margin-right: 10px;
        }

        .flex-between {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .price-display {
          font-weight: 600;
          color: var(--primary-color);
        }

        .price-edit-inline {
          display: inline-block;
        }

        .price-input {
          width: 100px;
          padding: 6px 10px;
          border: 2px solid var(--primary-color);
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
        }

        .edit-actions,
        .normal-actions {
          display: flex;
          gap: 8px;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 12px;
        }

        .btn-success {
          background-color: #28a745;
          color: white;
        }

        .btn-success:hover {
          background-color: #218838;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 4px;
          margin-bottom: 16px;
        }

        .alert-success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .alert-danger {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        @media (max-width: 768px) {
          .admin-table th,
          .admin-table td {
            padding: 8px;
            font-size: 13px;
          }

          .btn-sm {
            padding: 4px 8px;
            font-size: 11px;
          }

          .price-input {
            width: 80px;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminProducts;
