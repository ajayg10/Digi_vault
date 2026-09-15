import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscriptionAPI } from '../api/subscription';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import {
  HiOutlineSparkles,
  HiOutlineShieldCheck,
  HiOutlineCheck,
  HiOutlineX,
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

  const loadData = useCallback(async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        subscriptionAPI.getPlans(),
        subscriptionAPI.getStatus(),
      ]);
      setPlans(plansRes.data.plans);
      setSubscription(subRes.data);
    } catch {
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
          color: '#C6533D',
          backdrop_color: 'rgba(25, 24, 23, 0.85)',
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
        <h1 className="page-title">Workspace Memberships</h1>
        <p className="page-subtitle">
          Transparent, private data vault storage designed for professionals who value security.
        </p>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="billing-toggle-row">
        <span className={`billing-label ${billingCycle === 'monthly' ? 'active' : ''}`}>
          Billed Monthly
        </span>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={billingCycle === 'yearly'}
            onChange={(e) => setBillingCycle(e.target.checked ? 'yearly' : 'monthly')}
            aria-label="Toggle annual billing"
          />
          <span className="toggle-slider" />
        </label>
        <span className={`billing-label ${billingCycle === 'yearly' ? 'active' : ''}`}>
          Billed Yearly
        </span>
        <span className="save-chip">Save 16%</span>
      </div>

      {/* Plans Grid */}
      <div className="plans-grid">
        {/* Free Plan */}
        <Card className={`plan-card ${currentPlan === 'free' ? 'plan-current' : ''}`}>
          {currentPlan === 'free' && (
            <div className="current-badge-wrap">
              <Badge variant="default" size="sm">
                Current Plan
              </Badge>
            </div>
          )}
          <div className="plan-head">
            <h2 className="plan-name">Free Vault</h2>
            <p className="plan-summary">Essential encrypted storage for personal use.</p>
          </div>

          <div className="plan-pricing-block">
            <span className="price-symbol">₹</span>
            <span className="price-figure">0</span>
            <span className="price-cadence">/ forever</span>
          </div>

          <ul className="plan-feature-list">
            {freePlan?.features.map((f, i) => (
              <li key={i}>
                <HiOutlineCheck className="feat-check" />
                <span>{f}</span>
              </li>
            ))}
            <li className="feat-disabled">
              <HiOutlineX className="feat-cross" />
              <span>Priority multi-region replication</span>
            </li>
            <li className="feat-disabled">
              <HiOutlineX className="feat-cross" />
              <span>Direct engineer support</span>
            </li>
          </ul>

          <Button
            variant="secondary"
            fullWidth
            disabled
            style={{ marginTop: 'auto' }}
          >
            {currentPlan === 'free' ? 'Active Membership' : 'Free Tier'}
          </Button>
        </Card>

        {/* Pro Plan */}
        <Card className={`plan-card plan-featured ${isProActive ? 'plan-current' : ''}`}>
          <div className="current-badge-wrap">
            {isProActive ? (
              <Badge variant="success" dot size="sm">
                Active Pro
              </Badge>
            ) : (
              <span className="featured-chip">RECOMMENDED</span>
            )}
          </div>

          <div className="plan-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <HiOutlineSparkles style={{ color: 'var(--accent)', fontSize: '1.2rem' }} />
              <h2 className="plan-name">DigiVault Pro</h2>
            </div>
            <p className="plan-summary">Extensive capacity, unlimited workspaces, and priority tools.</p>
          </div>

          <div className="plan-pricing-block">
            <span className="price-symbol">₹</span>
            <span className="price-figure">
              {proPrice ? formatPrice(proPrice) : '—'}
            </span>
            <span className="price-cadence">
              {billingCycle === 'monthly' ? '/ month' : '/ year'}
              {monthlyEquivalent && ` (₹${monthlyEquivalent}/mo)`}
            </span>
          </div>

          <ul className="plan-feature-list">
            {proPlan?.features.map((f, i) => (
              <li key={i}>
                <HiOutlineCheck className="feat-check" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          {isProActive ? (
            <Button
              variant="danger"
              fullWidth
              onClick={handleCancel}
              loading={processing}
              style={{ marginTop: 'auto' }}
            >
              Cancel Subscription
            </Button>
          ) : (
            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={handleUpgrade}
              loading={processing}
              style={{ marginTop: 'auto' }}
            >
              Upgrade to Pro
            </Button>
          )}
        </Card>
      </div>

      {/* Subscription Active Info */}
      {isProActive && subscription?.current_period_end && (
        <div className="pricing-notice-banner banner-sage">
          <HiOutlineInformationCircle />
          <span>
            Your <strong>Pro</strong> membership is active through{' '}
            <strong>{format(new Date(subscription.current_period_end), 'PPP')}</strong> (
            {subscription.billing_cycle === 'monthly' ? 'Monthly billing' : 'Annual billing'}).
          </span>
        </div>
      )}

      {isProCancelled && subscription?.current_period_end && (
        <div className="pricing-notice-banner banner-amber">
          <HiOutlineInformationCircle />
          <span>
            Subscription cancelled. You retain <strong>Pro</strong> features until{' '}
            <strong>{format(new Date(subscription.current_period_end), 'PPP')}</strong>, after which your account reverts to Free.
          </span>
        </div>
      )}

      <div className="pricing-footer-note">
        <HiOutlineShieldCheck />
        <span>Payments processed securely via Razorpay PCI-DSS certified checkout. No sensitive card data is stored on DigiVault servers.</span>
      </div>
    </div>
  );
}
