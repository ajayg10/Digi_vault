import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscriptionAPI } from '../api/subscription';
import {
  HiOutlineSparkles,
  HiOutlineShieldCheck,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineLightningBolt,
  HiOutlineInformationCircle,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import './Pricing.css';

export default function Pricing() {
  const { user, refreshProfile } = useAuth();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        subscriptionAPI.getPlans(),
        subscriptionAPI.getStatus(),
      ]);
      setPlans(plansRes.data.plans);
      setSubscription(subRes.data);
    } catch {
      toast.error('Failed to load plan data');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (paise) => {
    return Math.round(paise / 100);
  };

  const handleUpgrade = async () => {
    setProcessing(true);
    try {
      // 1. Create order on backend
      const { data: order } = await subscriptionAPI.createOrder('pro', billingCycle);

      // 2. Open Razorpay checkout
      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'DigiVault',
        description: `Pro Plan — ${billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}`,
        order_id: order.order_id,
        handler: async function (response) {
          // 3. Verify payment on backend
          try {
            const { data } = await subscriptionAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success(data.message || 'Plan upgraded to Pro!');
            await refreshProfile();
            await loadData();
          } catch (err) {
            toast.error(err.response?.data?.detail || 'Payment verification failed');
          } finally {
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
          },
        },
        prefill: {
          email: user?.email || '',
        },
        theme: {
          color: '#6366f1',
          backdrop_color: 'rgba(10, 14, 26, 0.85)',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        toast.error(`Payment failed: ${response.error.description}`);
        setProcessing(false);
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create payment order');
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your Pro subscription?')) return;
    setProcessing(true);
    try {
      const { data } = await subscriptionAPI.cancel();
      toast.success(data.message);
      await refreshProfile();
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to cancel subscription');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="pricing-loading">
        <div className="spinner" />
      </div>
    );
  }

  const currentPlan = user?.plan || subscription?.plan || 'free';
  const isProActive = currentPlan === 'pro' && subscription?.status === 'active';
  const isProCancelled = currentPlan === 'pro' && subscription?.status === 'cancelled';

  const freePlan = plans.find((p) => p.name === 'free');
  const proPlan = plans.find((p) => p.name === 'pro');

  const proPrice =
    billingCycle === 'monthly'
      ? proPlan?.price_monthly
      : proPlan?.price_yearly;

  const monthlyEquivalent =
    billingCycle === 'yearly' && proPlan
      ? Math.round(proPlan.price_yearly / 12 / 100)
      : null;

  return (
    <div className="pricing-page animate-fade-in">
      <div className="pricing-header">
        <h1 className="page-title">Choose Your Plan</h1>
        <p className="page-subtitle">
          Unlock the full power of DigiVault with Pro. More storage, unlimited files, and premium features.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="billing-toggle">
        <span className={`billing-label ${billingCycle === 'monthly' ? 'active' : ''}`}>
          Monthly
        </span>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={billingCycle === 'yearly'}
            onChange={(e) => setBillingCycle(e.target.checked ? 'yearly' : 'monthly')}
          />
          <span className="toggle-slider" />
        </label>
        <span className={`billing-label ${billingCycle === 'yearly' ? 'active' : ''}`}>
          Yearly
        </span>
        <span className="save-badge">Save 16%</span>
      </div>

      {/* Plans Grid */}
      <div className="plans-grid stagger-children">
        {/* Free Card */}
        <div className="plan-card plan-free">
          {currentPlan === 'free' && <span className="current-badge">Current Plan</span>}
          <div className="plan-card-content">
            <div className="plan-icon">
              <HiOutlineShieldCheck />
            </div>
            <h2 className="plan-name">Free</h2>
            <p className="plan-description">Get started with essential features</p>

            <div className="plan-price">
              <span className="price-currency">₹</span>
              <span className="price-amount">0</span>
            </div>
            <p className="price-period">Free forever</p>

            <ul className="plan-features">
              {freePlan?.features.map((f, i) => (
                <li key={i}>
                  <HiOutlineCheck className="feature-check" />
                  {f}
                </li>
              ))}
              <li>
                <HiOutlineX className="feature-cross" />
                Advanced analytics
              </li>
              <li>
                <HiOutlineX className="feature-cross" />
                Priority support
              </li>
            </ul>

            <button
              className="plan-cta plan-cta-free"
              disabled={currentPlan === 'free'}
            >
              {currentPlan === 'free' ? 'Your Current Plan' : 'Downgrade'}
            </button>
          </div>
        </div>

        {/* Pro Card */}
        <div className="plan-card plan-pro">
          {isProActive ? (
            <span className="current-badge">Current Plan</span>
          ) : (
            <span className="popular-badge">✦ Popular</span>
          )}
          <div className="plan-card-content">
            <div className="plan-icon">
              <HiOutlineSparkles />
            </div>
            <h2 className="plan-name">Pro</h2>
            <p className="plan-description">Everything you need, no limits</p>

            <div className="plan-price">
              <span className="price-currency">₹</span>
              <span className="price-amount">{proPrice ? formatPrice(proPrice) : '—'}</span>
              {billingCycle === 'yearly' && proPlan && (
                <span className="price-original">
                  ₹{formatPrice(proPlan.price_monthly * 12)}
                </span>
              )}
            </div>
            <p className="price-period">
              {billingCycle === 'monthly' ? '/month' : '/year'}
              {monthlyEquivalent && ` (₹${monthlyEquivalent}/mo)`}
            </p>

            <ul className="plan-features">
              {proPlan?.features.map((f, i) => (
                <li key={i}>
                  <HiOutlineCheck className="feature-check" />
                  {f}
                </li>
              ))}
            </ul>

            {isProActive ? (
              <button
                className="plan-cta plan-cta-cancel"
                onClick={handleCancel}
                disabled={processing}
              >
                {processing ? 'Processing…' : 'Cancel Subscription'}
              </button>
            ) : (
              <button
                className="plan-cta plan-cta-pro"
                onClick={handleUpgrade}
                disabled={processing}
              >
                {processing ? (
                  'Processing…'
                ) : (
                  <>
                    <HiOutlineLightningBolt /> Upgrade to Pro
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Subscription info banner */}
      {isProActive && subscription?.current_period_end && (
        <div className="sub-info-banner">
          <HiOutlineInformationCircle className="sub-info-icon" />
          <p className="sub-info-text">
            Your <strong>Pro</strong> plan is active until{' '}
            <strong>{format(new Date(subscription.current_period_end), 'PPP')}</strong>.
            {subscription.billing_cycle === 'monthly' ? ' Billed monthly.' : ' Billed yearly.'}
          </p>
        </div>
      )}

      {isProCancelled && subscription?.current_period_end && (
        <div className="sub-info-banner">
          <HiOutlineInformationCircle className="sub-info-icon" />
          <p className="sub-info-text">
            Your subscription has been cancelled. You'll keep <strong>Pro</strong> access until{' '}
            <strong>{format(new Date(subscription.current_period_end), 'PPP')}</strong>,
            then revert to the Free plan.
          </p>
        </div>
      )}

      {/* Security note */}
      <div className="security-note">
        <HiOutlineShieldCheck />
        <span>Payments are secured by Razorpay. We never store your card details.</span>
      </div>
    </div>
  );
}
