export function HeroSection() {
  return (
    <div className="hero">
      <div className="container">
        <div className="hero-content">
          <div className="hero-logo animate-float">
            <img src="/ordery-text.png" alt="Ordery" />
          </div>

          <h1 className="hero-title">
            Simplify Your Orders,
            <br />
            Amplify Your Success
          </h1>

          <p className="hero-subtitle">
            Transform your order management with our intelligent platform. Merge
            orders, boost efficiency, and delight customers with every order.
          </p>

          <div className="hero-buttons">
            <button className="btn btn-primary btn-lg glow">
              Start Free Trial
              <span className="icon icon-arrow-right"></span>
            </button>
          </div>

          <div className="hero-features">
            <div className="hero-feature">
              <div className="hero-feature-dot hero-feature-dot-primary"></div>
              <span>Free for the first 1000 users</span>
            </div>
            <div className="hero-feature">
              <div className="hero-feature-dot hero-feature-dot-accent"></div>
              <span>No credit card required</span>
            </div>
            <div className="hero-feature">
              <div className="hero-feature-dot hero-feature-dot-glow"></div>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
        <a href="/privacy" className="privacy-link">
          Privacy Policy
          <span className="icon icon-arrow-right"></span>
        </a>
      </div>
    </div>
  );
}
