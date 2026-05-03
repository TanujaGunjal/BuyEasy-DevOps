import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaTrash, FaShoppingCart, FaBell, FaTimes } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatPrice, formatSubtotal } from '../utils/priceFormatter';

const Cart = () => {
  const { cart, updateCartItem, removeFromCart, loading } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Price alert state
  const [alertState, setAlertState] = useState({});
  const [settingAlert, setSettingAlert] = useState(null);
  const [alertMessage, setAlertMessage] = useState('');

  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    await updateCartItem(itemId, newQuantity);
  };

  const handleRemove = async (itemId) => {
    if (window.confirm('Remove this item from cart?')) {
      await removeFromCart(itemId);
    }
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      navigate('/checkout');
    }
  };

  // Set price alert
  const handleSetPriceAlert = async (productId, currentPrice) => {
    const targetPrice = alertState[productId];

    if (!targetPrice || targetPrice <= 0) {
      setAlertMessage('Please enter a valid price');
      return;
    }

    if (targetPrice >= currentPrice) {
      setAlertMessage('Target price must be less than current price');
      return;
    }

    try {
      setSettingAlert(productId);
      await api.put(`/cart/${productId}/alert`, { targetPrice: parseFloat(targetPrice) });
      
      setAlertMessage(`✅ Price alert set! You'll be notified when price drops to ${formatPrice(targetPrice)}`);
      setAlertState({ ...alertState, [productId]: '' });
      
      // Refresh cart to show updated alert status
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      setAlertMessage(`❌ Error: ${error.response?.data?.message || 'Failed to set alert'}`);
    } finally {
      setSettingAlert(null);
    }
  };

  // Remove price alert
  const handleRemovePriceAlert = async (productId) => {
    try {
      await api.delete(`/cart/${productId}/alert`);
      setAlertMessage('✅ Price alert removed');
      
      // Refresh cart
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      setAlertMessage(`❌ Error: ${error.response?.data?.message || 'Failed to remove alert'}`);
    }
  };

  if (loading) {
    return <div className="loading">Loading cart...</div>;
  }

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="container py-3">
        <div className="card text-center py-3">
          <FaShoppingCart size={64} color="#ccc" />
          <h2 className="mt-2">Your cart is empty</h2>
          <p>Start shopping to add items to your cart</p>
          <Link to="/products" className="btn btn-primary mt-2">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page py-3">
      <div className="container">
        <h1 className="mb-2">Shopping Cart</h1>

        {/* Alert Message */}
        {alertMessage && (
          <div className={`alert-banner ${alertMessage.includes('✅') ? 'success' : 'error'}`}>
            {alertMessage}
          </div>
        )}

        <div className="cart-grid">
          <div className="cart-items">
            {cart.items.map((item) => (
              <div key={item._id} className="card cart-item">
                <div className="cart-item-content">
                  <img
                    src={item.product.thumbnail?.startsWith('http')
                      ? item.product.thumbnail
                      : `http://localhost:5000/${item.product.thumbnail}`
                    }
                    alt={item.product.name}
                    className="cart-item-image"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/100x100/4F46E5/ffffff?text=Product';
                    }}
                  />
                  <div className="cart-item-details">
                    <h3>{item.product.name}</h3>
                    <p className="product-price">{formatPrice(item.price)}</p>
                    <div className="quantity-controls">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleQuantityChange(item._id, item.quantity - 1)}
                      >
                        -
                      </button>
                      <span className="quantity">{item.quantity}</span>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                      >
                        +
                      </button>
                    </div>

                    {/* Price Alert Section */}
                    <div className="price-alert-section">
                      {item.targetPrice ? (
                        <div className="alert-active">
                          <FaBell className="bell-icon" />
                          <span>Alert set at {formatPrice(item.targetPrice)}</span>
                          <button
                            className="btn btn-sm btn-link remove-alert"
                            onClick={() => handleRemovePriceAlert(item.product._id)}
                            title="Remove alert"
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ) : (
                        <div className="alert-input-group">
                          <input
                            type="number"
                            placeholder="Target price"
                            className="price-input"
                            value={alertState[item.product._id] || ''}
                            onChange={(e) => 
                              setAlertState({ ...alertState, [item.product._id]: e.target.value })
                            }
                            step="0.01"
                            min="0"
                          />
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleSetPriceAlert(item.product._id, item.price)}
                            disabled={settingAlert === item.product._id}
                          >
                            {settingAlert === item.product._id ? 'Setting...' : 'Set Alert'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="cart-item-actions">
                    <p className="item-total">
                      {formatSubtotal(item.price, item.quantity)}
                    </p>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRemove(item._id)}
                    >
                      <FaTrash /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary card">
            <h3>Order Summary</h3>
            <div className="summary-row">
              <span>Items ({cart.totalItems}):</span>
              <span>{formatPrice(cart.totalPrice)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping:</span>
              <span>{formatPrice(cart.totalPrice > 50 ? 0 : 9.99)}</span>
            </div>
            <div className="summary-row">
              <span>Tax (10%):</span>
              <span>{formatPrice(cart.totalPrice * 0.1)}</span>
            </div>
            <hr />
            <div className="summary-row total">
              <strong>Total:</strong>
              <strong>
                {formatPrice(cart.totalPrice + (cart.totalPrice > 50 ? 0 : 9.99) + cart.totalPrice * 0.1)}
              </strong>
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '20px' }}
              onClick={handleCheckout}
            >
              Proceed to Checkout
            </button>
            <Link
              to="/products"
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '10px' }}
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .cart-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
        }

        .alert-banner {
          padding: 15px 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-weight: 500;
          animation: slideIn 0.3s ease-in-out;
        }

        .alert-banner.success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .alert-banner.error {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        @keyframes slideIn {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .price-alert-section {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e0e0e0;
        }

        .alert-active {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background-color: #e8f5e9;
          border-left: 4px solid #4caf50;
          border-radius: 4px;
          color: #2e7d32;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .bell-icon {
          color: #ffd700;
          font-size: 1rem;
        }

        .remove-alert {
          margin-left: auto;
          background: none;
          border: none;
          color: #d32f2f;
          cursor: pointer;
          padding: 0;
          font-size: 1rem;
        }

        .remove-alert:hover {
          color: #b71c1c;
        }

        .alert-input-group {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .price-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #d0d0d0;
          border-radius: 4px;
          font-size: 0.9rem;
          outline: none;
        }

        .price-input:focus {
          border-color: #1D9E75;
          box-shadow: 0 0 4px rgba(29, 158, 117, 0.2);
        }

        .cart-item-content {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }

        .cart-item-image {
          width: 100px;
          height: 100px;
          object-fit: cover;
          border-radius: 8px;
          flex-shrink: 0;
        }

        .cart-item-details {
          flex: 1;
        }

        .cart-item-details h3 {
          margin-bottom: 10px;
        }

        .quantity-controls {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 10px;
        }

        .quantity {
          padding: 5px 15px;
          border: 1px solid var(--border-color);
          border-radius: 5px;
          min-width: 50px;
          text-align: center;
        }

        .cart-item-actions {
          text-align: right;
          flex-shrink: 0;
        }

        .item-total {
          font-size: 1.3rem;
          font-weight: bold;
          color: var(--primary-color);
          margin-bottom: 10px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 0.95rem;
        }

        .summary-row.total {
          font-size: 1.1rem;
          font-weight: bold;
        }

        @media (max-width: 768px) {
          .cart-grid {
            grid-template-columns: 1fr;
          }

          .cart-item-content {
            flex-direction: column;
            align-items: center;
          }

          .cart-item-image {
            width: 150px;
            height: 150px;
          }

          .cart-item-details {
            width: 100%;
          }

          .alert-input-group {
            flex-direction: column;
          }

          .price-input {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default Cart;
