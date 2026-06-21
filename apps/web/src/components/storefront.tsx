"use client";

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import {
  ArrowRight,
  ChevronDown,
  Leaf,
  Menu,
  Minus,
  Plus,
  ShoppingBag,
  Sprout,
  Truck,
  X,
} from "lucide-react";
import { addOns, catalog, metroPueblos, products, type CartItem, type Product, type ProductKind } from "@/lib/catalog";
import {
  bottleCount,
  cartCount,
  cartProducts,
  cartTotalCents,
  estimatedProduceLb,
  formatPrice,
  isMetroTown,
  productMatchesSearch,
  quizRecommendation,
  remaining,
  remainingForDeliveryCents,
  type QuizAnswers,
} from "@/lib/commerce";

type CheckoutState =
  | { status: "idle"; message: string }
  | { status: "loading"; message: string }
  | { status: "error"; message: string }
  | { status: "ready"; message: string };

type ContactState =
  | { status: "idle"; message: string }
  | { status: "loading"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type StorefrontProps = {
  commerceConfigured: boolean;
};

const defaultQuizAnswers: QuizAnswers = {
  vibe: "refresh",
  flavor: "tropical",
  nutrient: "immune",
};

function cardStyle(variable: "--card-color" | "--spotlight-color", color: string): CSSProperties {
  return { [variable]: color } as CSSProperties;
}

function ProductImage({ product }: { product: Product }) {
  return <img src={product.image} alt="" loading="lazy" />;
}

const sectionAnchorGapPx = 0;

export function Storefront({ commerceConfigured }: StorefrontProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeKind, setActiveKind] = useState<ProductKind | "all">("all");
  const [selectedProduct, setSelectedProduct] = useState<Product>(products[5]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deliveryTown, setDeliveryTown] = useState("San Juan");
  const [customerEmail, setCustomerEmail] = useState("");
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswers>(defaultQuizAnswers);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>({
    status: "idle",
    message: commerceConfigured
      ? "Stripe Checkout will open after server validation."
      : "Checkout is paused until Supabase and Stripe env vars are configured.",
  });
  const [contactState, setContactState] = useState<ContactState>({
    status: "idle",
    message: "For events, delivery questions, and pueblos outside the first route.",
  });

  const visibleProducts = useMemo(() => {
    const byKind = activeKind === "all" ? products : products.filter((product) => product.kind === activeKind);
    return byKind.filter((product) => productMatchesSearch(product, searchQuery));
  }, [activeKind, searchQuery]);

  const lines = cartProducts(cart);
  const total = cartTotalCents(cart);
  const bottles = bottleCount(cart);
  const produce = estimatedProduceLb(cart);
  const metro = isMetroTown(deliveryTown);
  const recommended = quizRecommendation(quizAnswers);
  const currentDropRemaining = products.reduce((sum, product) => sum + remaining(product), 0);

  function addToCart(productSlug: string) {
    setCart((current) => {
      const existing = current.find((item) => item.productSlug === productSlug);
      if (existing) {
        return current.map((item) =>
          item.productSlug === productSlug ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...current, { productSlug, quantity: 1 }];
    });
    setCartOpen(true);
  }

  function updateQuantity(productSlug: string, delta: number) {
    setCart((current) =>
      current
        .map((item) => (item.productSlug === productSlug ? { ...item, quantity: Math.max(item.quantity + delta, 0) } : item))
        .filter((item) => item.quantity > 0),
    );
  }

  function selectProduct(productSlug: string) {
    const product = products.find((candidate) => candidate.slug === productSlug);
    if (!product) return;
    setSelectedProduct(product);
    setSearchQuery("");
    document.querySelector("#la-cepa")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scrollToSection(sectionId: string) {
    setMobileNavOpen(false);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const target = document.getElementById(sectionId);
        if (!target) return;

        const headerHeight = document.querySelector<HTMLElement>(".site-header")?.getBoundingClientRect().height ?? 0;
        const dropStats = document.querySelector<HTMLElement>(".drop-stats");
        const dropStatsStyle = dropStats ? window.getComputedStyle(dropStats) : null;
        const dropStatsTop = dropStatsStyle?.position === "sticky" ? Number.parseFloat(dropStatsStyle.top) || 0 : 0;
        const dropStatsBottom =
          dropStatsStyle?.position === "sticky" ? dropStatsTop + (dropStats?.getBoundingClientRect().height ?? 0) : 0;
        const stickyStackHeight = Math.max(headerHeight, dropStatsBottom);
        const scrollTop = target.getBoundingClientRect().top + window.scrollY - stickyStackHeight - sectionAnchorGapPx;

        window.scrollTo({ top: Math.max(0, scrollTop), behavior: "smooth" });
        window.history.replaceState(null, "", `#${sectionId}`);
      });
    });
  }

  useEffect(() => {
    const sectionId = window.location.hash.slice(1);
    if (!sectionId) return;

    const timeout = window.setTimeout(() => scrollToSection(sectionId), 250);
    return () => window.clearTimeout(timeout);
  }, []);

  async function checkout() {
    if (!cart.length) return;

    setCheckoutState({ status: "loading", message: "Validating cart and reserving capacity..." });

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: cart,
          deliveryPueblo: deliveryTown,
          customerEmail,
        }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Checkout is unavailable right now.");
      }

      setCheckoutState({ status: "ready", message: "Reserved. Opening Stripe Checkout..." });
      window.location.href = payload.url;
    } catch (error) {
      setCheckoutState({
        status: "error",
        message: error instanceof Error ? error.message : "Checkout is unavailable right now.",
      });
    }
  }

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setContactState({ status: "loading", message: "Sending..." });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          topic: String(formData.get("topic") ?? "general"),
          message: String(formData.get("message") ?? ""),
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) throw new Error(payload.error ?? "Message could not be sent.");

      event.currentTarget.reset();
      setContactState({ status: "success", message: "Message received. We will follow up soon." });
    } catch (error) {
      setContactState({
        status: "error",
        message: error instanceof Error ? error.message : "Message could not be sent.",
      });
    }
  }

  return (
    <div className="site-shell">
      <div className="announcement">
        <span>Delivery en SJ, PR</span>
        <span>Sin preservativos</span>
        <span>Sin azúcar añadida</span>
        <span>Cold pressed</span>
      </div>

      <header className="site-header">
        <button
          className="icon-button mobile-menu"
          type="button"
          aria-label="Open menu"
          aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavOpen((open) => !open)}
        >
          <Menu size={22} />
        </button>
        <a className="brand-mark" href="#shop" aria-label="Cepa Isleña home">
          <img src="/brand/logo-borra.png" alt="Cepa Isleña" />
        </a>
        <DesktopNav selectProduct={selectProduct} scrollToSection={scrollToSection} />
        <button className="cart-button" type="button" onClick={() => setCartOpen(true)}>
          <ShoppingBag size={19} /> Cart <span>{cartCount(cart)}</span>
        </button>
      </header>

      {mobileNavOpen ? (
        <MobileNav selectProduct={selectProduct} close={() => setMobileNavOpen(false)} scrollToSection={scrollToSection} />
      ) : null}

      <section className="drop-stats" aria-label="Live drop stats">
        <div>
          <span>Local produce in this cart</span>
          <strong>{produce} lb</strong>
        </div>
        <div>
          <span>Bottles reserved</span>
          <strong>{bottles}</strong>
        </div>
        <a className="middle-buy" href="#products">
          Order now
        </a>
        <div>
          <span>Delivery area</span>
          <strong>{metro ? "Metro ready" : "Working on it"}</strong>
        </div>
        <div>
          <span>Current drop</span>
          <strong>{currentDropRemaining} left</strong>
        </div>
      </section>

      <main>
        <section className="shop-hero" id="shop">
          <div className="hero-copy">
            <img className="hero-logo" src="/brand/logo-borra.png" alt="Cepa Isleña" />
            <h1>Jugos verdes y shots, made fresh by drop.</h1>
            <p>
              100% natural, sin preservativos, sin azúcar añadida. Cold pressed en SJ, PR para cuidar el cuerpo, la isla
              y el corillo.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#products">
                Shop all products <ArrowRight size={18} />
              </a>
              <button className="button secondary" type="button" onClick={() => addToCart("mvp-sample-bundle")}>
                Add sample bundle
              </button>
            </div>
          </div>
          <div className="hero-panel" aria-label="Cepa product artwork">
            <img src="/brand/corillo-street.png" alt="" />
          </div>
        </section>

        <section className="info-strip" aria-label="Cepa product promises">
          <div>
            <Leaf size={20} />
            <span>100% natural</span>
          </div>
          <div>
            <Sprout size={20} />
            <span>Ingredientes con intención</span>
          </div>
          <div>
            <Truck size={20} />
            <span>Delivery por drop local</span>
          </div>
          <div>
            <span className="stamp">Shake well</span>
            <span>La separación es natural</span>
          </div>
        </section>

        <section className="shop-section" id="products">
          <div className="section-heading">
            <div>
              <p>All Products</p>
              <h2>Shop the Cepa drop</h2>
            </div>
            <div className="shop-tools">
              <label className="search-box" htmlFor="product-search">
                <span>Search</span>
                <input
                  id="product-search"
                  type="search"
                  value={searchQuery}
                  placeholder="ginger, immune, bundle..."
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </label>
              <div className="filters" aria-label="Product filters">
                {[
                  ["all", "All"],
                  ["juice", "Juices"],
                  ["shot", "Shots"],
                  ["bundle", "Bundles"],
                ].map(([kind, label]) => (
                  <button
                    key={kind}
                    className={activeKind === kind ? "active" : ""}
                    type="button"
                    onClick={() => setActiveKind(kind as ProductKind | "all")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {visibleProducts.length ? (
            <div className="product-grid">
              {visibleProducts.map((product) => (
                <ProductCard key={product.slug} product={product} addToCart={addToCart} selectProduct={selectProduct} />
              ))}
            </div>
          ) : (
            <div className="no-results">
              <h3>No products found</h3>
              <p>Try searching by flavor, nutrient, or product type.</p>
            </div>
          )}
        </section>

        <section className="bundle-feature" id="bundles">
          <div className="bundle-art">
            <img src="/brand/corillo-logo-scene.png" alt="Cepa Corillo illustration" />
          </div>
          <div className="bundle-copy">
            <p>One SKU, all MVP flavors</p>
            <h2>MVP Sample Bundle</h2>
            <span className="price-lockup">$22 / 5 x 4 oz bottles</span>
            <p>Like a sampler pack: the cart sees one bundle, but the backend reserves one pour from each recipe.</p>
            <ul>
              {products[5].components.map((component) => (
                <li key={component.recipeSlug}>
                  <span>{component.recipeName}</span>
                  <span>{component.ounces} oz</span>
                </li>
              ))}
            </ul>
            <button className="button primary wide" type="button" onClick={() => addToCart("mvp-sample-bundle")}>
              Add bundle to cart
            </button>
          </div>
        </section>

        <section className="detail-section" id="la-cepa">
          <Spotlight product={selectedProduct} addToCart={addToCart} />
          <div className="story-card">
            <p>La Cepa</p>
            <h2>Aquí nadie crece solo.</h2>
            <p>
              Cepa nace de pausar el ritmo: apoyar agricultura local, consumir con intención y hacer que cuidarnos se
              sienta cercano, real y de aquí.
            </p>
            <a href="#products">
              Back to shop <ArrowRight size={18} />
            </a>
          </div>
        </section>

        <AboutSection />
        <SubscriptionSection addToCart={addToCart} />
        <DeliverySection deliveryTown={deliveryTown} setDeliveryTown={setDeliveryTown} metro={metro} />
        <QuizSection answers={quizAnswers} setAnswers={setQuizAnswers} recommendation={recommended} addToCart={addToCart} />
        <TestimonialsSection />
        <ContactSection contactState={contactState} submitContact={submitContact} />
      </main>

      <Footer />
      <CartDrawer
        cartOpen={cartOpen}
        cart={cart}
        lines={lines}
        total={total}
        bottles={bottles}
        remainingForDelivery={remainingForDeliveryCents(cart)}
        customerEmail={customerEmail}
        setCustomerEmail={setCustomerEmail}
        checkoutState={checkoutState}
        commerceConfigured={commerceConfigured}
        close={() => setCartOpen(false)}
        addToCart={addToCart}
        updateQuantity={updateQuantity}
        checkout={checkout}
      />
    </div>
  );
}

function DesktopNav({
  selectProduct,
  scrollToSection,
}: {
  selectProduct: (productSlug: string) => void;
  scrollToSection: (sectionId: string) => void;
}) {
  return (
    <nav className="nav-links" aria-label="Main navigation">
      {[
        ["shop", "Home"],
        ["about", "About Us"],
        ["products", "Order"],
        ["contact", "Contact Us"],
      ].map(([id, label]) => (
        <a
          href={`#${id}`}
          key={id}
          onClick={(event) => {
            event.preventDefault();
            scrollToSection(id);
          }}
        >
          {label}
        </a>
      ))}
      <ShopDropdown selectProduct={selectProduct} />
    </nav>
  );
}

function MobileNav({
  selectProduct,
  close,
  scrollToSection,
}: {
  selectProduct: (productSlug: string) => void;
  close: () => void;
  scrollToSection: (sectionId: string) => void;
}) {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {["shop", "about", "products", "delivery", "quiz", "contact"].map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => scrollToSection(id)}
        >
          {id === "products" ? "Order" : id}
        </button>
      ))}
      {products.map((product) => (
        <button
          key={product.slug}
          type="button"
          onClick={() => {
            close();
            window.requestAnimationFrame(() => {
              window.requestAnimationFrame(() => selectProduct(product.slug));
            });
          }}
        >
          {product.name}
        </button>
      ))}
    </nav>
  );
}

function ShopDropdown({ selectProduct }: { selectProduct: (productSlug: string) => void }) {
  return (
    <div className="shop-dropdown">
      <button type="button" className="nav-dropdown-button" aria-haspopup="menu">
        Shop <ChevronDown size={15} />
      </button>
      <div className="shop-dropdown-menu" role="menu">
        {products.map((product) => (
          <button key={product.slug} type="button" role="menuitem" onClick={() => selectProduct(product.slug)}>
            <span className="shop-dropdown-thumb">
              <ProductImage product={product} />
            </span>
            <span className="shop-dropdown-copy">
              <span>{product.name}</span>
              <small>{product.kind === "bundle" ? "Bundle" : product.size}</small>
            </span>
            <strong>{formatPrice(product.priceCents)}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProductCard({
  product,
  addToCart,
  selectProduct,
}: {
  product: Product;
  addToCart: (productSlug: string) => void;
  selectProduct: (productSlug: string) => void;
}) {
  const available = remaining(product);
  const percentage = Math.min(100, Math.round((product.sold / product.capacity) * 100));

  return (
    <article className="product-card" style={cardStyle("--card-color", product.color)}>
      <button className="product-image" type="button" onClick={() => selectProduct(product.slug)}>
        <ProductImage product={product} />
      </button>
      <div className="product-meta">
        <div>
          <p>{product.kind === "bundle" ? "Bundle" : product.size}</p>
          <h3>{product.name}</h3>
        </div>
        <span>{formatPrice(product.priceCents)}</span>
      </div>
      <p className="product-short">{product.short}</p>
      <div className="capacity" aria-label={`${available} available`}>
        <div>
          <span>{available} left</span>
          <span>{product.capacity} cap</span>
        </div>
        <span>
          <i style={{ width: `${percentage}%` }} />
        </span>
      </div>
      <div className="product-tags">
        {product.tags.slice(0, 2).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <button className="quick-add" type="button" onClick={() => addToCart(product.slug)}>
        Add <Plus size={16} />
      </button>
    </article>
  );
}

function Spotlight({ product, addToCart }: { product: Product; addToCart: (productSlug: string) => void }) {
  return (
    <article className="spotlight" style={cardStyle("--spotlight-color", product.color)}>
      <div>
        <p>{product.kind === "bundle" ? "Featured bundle" : "Featured recipe"}</p>
        <h2>{product.name}</h2>
        <span>{product.size}</span>
        <p>{product.description}</p>
        <div className="spotlight-tags">
          {product.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <button className="button primary" type="button" onClick={() => addToCart(product.slug)}>
          Add to cart <Plus size={18} />
        </button>
      </div>
      <ProductImage product={product} />
    </article>
  );
}

function AboutSection() {
  return (
    <section className="about-section" id="about">
      <div className="section-heading stacked">
        <p>About Us</p>
        <h2>Mission, vision, values y corillo.</h2>
      </div>
      <div className="about-grid">
        <article>
          <span>Mission</span>
          <h3>Nutrir con intención.</h3>
          <p>Ofrecemos jugos verdes y shots 100% naturales, hechos con ingredientes de origen agroecológico.</p>
        </article>
        <article>
          <span>Vision</span>
          <h3>Un Puerto Rico más conectado.</h3>
          <p>Queremos que apoyar la agricultura local sea parte de la vida cotidiana, no algo extraordinario.</p>
        </article>
        <article>
          <span>Values</span>
          <h3>Comunidad, calidad, cuidado.</h3>
          <p>Cepa se construye con manos reales, productores locales y decisiones pequeñas que sostienen algo más grande.</p>
        </article>
      </div>
    </section>
  );
}

function SubscriptionSection({ addToCart }: { addToCart: (productSlug: string) => void }) {
  return (
    <section className="subscription-section" id="subscription">
      <div>
        <p>Events + subscriptions</p>
        <h2>Easy buying now. Subscriptions next.</h2>
        <p>
          For MVP, weekly packs work like one-time drops. Later, Stripe subscriptions can power recurring delivery
          without changing the customer-facing flow.
        </p>
      </div>
      <div className="subscription-actions">
        <article>
          <h3>Weekly Corillo Pack</h3>
          <p>6 bottles delivered once a week in metro pueblos.</p>
          <button className="button primary" type="button" onClick={() => addToCart("mvp-sample-bundle")}>
            Try the bundle
          </button>
        </article>
        <article>
          <h3>Events</h3>
          <p>Small batch shots for pop-ups, office wellness, yoga mornings, and brand events.</p>
          <a className="button secondary" href="#contact">
            Ask about events
          </a>
        </article>
      </div>
    </section>
  );
}

function DeliverySection({
  deliveryTown,
  setDeliveryTown,
  metro,
}: {
  deliveryTown: string;
  setDeliveryTown: (value: string) => void;
  metro: boolean;
}) {
  return (
    <section className="delivery-section" id="delivery">
      <div>
        <p>Delivery</p>
        <h2>Metro pueblos first.</h2>
        <p>For the MVP, delivery stays close so the product arrives fresh and the process stays manageable.</p>
      </div>
      <div className="delivery-checker">
        <label htmlFor="town-search">Where are you ordering from?</label>
        <input
          id="town-search"
          type="text"
          value={deliveryTown}
          placeholder="San Juan, Carolina, Bayamon..."
          onChange={(event) => setDeliveryTown(event.target.value)}
        />
        <strong className="delivery-result">
          {metro ? "You are in the first delivery zone." : "We are still working to get the juice to you."}
        </strong>
        <p>Metro list: {metroPueblos.join(", ")}.</p>
      </div>
    </section>
  );
}

function optionButton({
  selected,
  label,
  onClick,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={selected ? "selected" : ""} onClick={onClick}>
      {label}
    </button>
  );
}

function QuizSection({
  answers,
  setAnswers,
  recommendation,
  addToCart,
}: {
  answers: QuizAnswers;
  setAnswers: (answers: QuizAnswers) => void;
  recommendation: Product;
  addToCart: (productSlug: string) => void;
}) {
  return (
    <section className="quiz-section" id="quiz">
      <div className="quiz-copy">
        <p>No email gate</p>
        <h2>Find your Cepa match.</h2>
        <p>Answer fast, get a pairing instantly. Later this can become an AI pairing flow for taste and routine.</p>
      </div>
      <div className="quiz-card">
        <div className="quiz-step">
          <span>1</span>
          <h3>What are you looking for?</h3>
          <div className="quiz-options">
            {optionButton({
              selected: answers.vibe === "refresh",
              label: "Refresh",
              onClick: () => setAnswers({ ...answers, vibe: "refresh" }),
            })}
            {optionButton({
              selected: answers.vibe === "cool",
              label: "Cool down",
              onClick: () => setAnswers({ ...answers, vibe: "cool" }),
            })}
            {optionButton({
              selected: answers.vibe === "try-all",
              label: "Try everything",
              onClick: () => setAnswers({ ...answers, vibe: "try-all" }),
            })}
          </div>
        </div>
        <div className="quiz-step">
          <span>2</span>
          <h3>Flavor mood?</h3>
          <div className="quiz-options">
            {optionButton({
              selected: answers.flavor === "tropical",
              label: "Tropical",
              onClick: () => setAnswers({ ...answers, flavor: "tropical" }),
            })}
            {optionButton({
              selected: answers.flavor === "citrus",
              label: "Citrus",
              onClick: () => setAnswers({ ...answers, flavor: "citrus" }),
            })}
            {optionButton({
              selected: answers.flavor === "earthy",
              label: "Earthy",
              onClick: () => setAnswers({ ...answers, flavor: "earthy" }),
            })}
          </div>
        </div>
        <div className="quiz-step">
          <span>3</span>
          <h3>Nutrient focus?</h3>
          <div className="quiz-options">
            {optionButton({
              selected: answers.nutrient === "immune",
              label: "Immune",
              onClick: () => setAnswers({ ...answers, nutrient: "immune" }),
            })}
            {optionButton({
              selected: answers.nutrient === "hydration",
              label: "Hydration",
              onClick: () => setAnswers({ ...answers, nutrient: "hydration" }),
            })}
            {optionButton({
              selected: answers.nutrient === "energy",
              label: "Energy",
              onClick: () => setAnswers({ ...answers, nutrient: "energy" }),
            })}
          </div>
        </div>
        <div className="quiz-result" style={cardStyle("--card-color", recommendation.color)}>
          <ProductImage product={recommendation} />
          <div>
            <p>Your match</p>
            <h3>{recommendation.name}</h3>
            <span>{recommendation.taste}</span>
            <button className="button primary" type="button" onClick={() => addToCart(recommendation.slug)}>
              Add match
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="testimonials-section" id="testimonials">
      <div className="section-heading stacked">
        <p>Testimonials by product</p>
        <h2>Lo que dice el corillo.</h2>
      </div>
      <div className="testimonial-grid">
        {products.slice(0, 6).map((product) => (
          <article key={product.slug} style={cardStyle("--card-color", product.color)}>
            <ProductImage product={product} />
            <div>
              <span>{product.name}</span>
              <p>&ldquo;{product.testimonial}&rdquo;</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ContactSection({
  contactState,
  submitContact,
}: {
  contactState: ContactState;
  submitContact: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="contact-section" id="contact">
      <div>
        <p>Contact Us</p>
        <h2>Questions, events, or outside metro?</h2>
      </div>
      <form className="contact-form" onSubmit={submitContact}>
        <div className="form-row">
          <label>
            <span>Name</span>
            <input name="name" required maxLength={120} />
          </label>
          <label>
            <span>Email</span>
            <input name="email" type="email" required maxLength={240} />
          </label>
        </div>
        <label>
          <span>Topic</span>
          <select name="topic" defaultValue="events">
            <option value="events">Events</option>
            <option value="outside-metro">Outside metro</option>
            <option value="general">General</option>
          </select>
        </label>
        <label>
          <span>Message</span>
          <textarea name="message" required maxLength={2000} rows={4} />
        </label>
        <div className={`form-status ${contactState.status}`}>{contactState.message}</div>
        <button className="button primary" type="submit" disabled={contactState.status === "loading"}>
          Contact Cepa
        </button>
      </form>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div>
        <img src="/brand/logo-borra.png" alt="Cepa Isleña" />
        <p>Jugos verdes y shots hechos con frutas, manos y mucha intención.</p>
      </div>
      <nav aria-label="Footer navigation">
        <a href="#shop">Home</a>
        <a href="#about">About Us</a>
        <a href="#products">Order</a>
        <a href="#quiz">Quiz</a>
        <a href="#contact">Contact</a>
      </nav>
      <div>
        <span>Instagram</span>
        <span>@cepaislena</span>
      </div>
    </footer>
  );
}

function CartDrawer({
  cartOpen,
  cart,
  lines,
  total,
  bottles,
  remainingForDelivery,
  customerEmail,
  setCustomerEmail,
  checkoutState,
  commerceConfigured,
  close,
  addToCart,
  updateQuantity,
  checkout,
}: {
  cartOpen: boolean;
  cart: CartItem[];
  lines: ReturnType<typeof cartProducts>;
  total: number;
  bottles: number;
  remainingForDelivery: number;
  customerEmail: string;
  setCustomerEmail: (value: string) => void;
  checkoutState: CheckoutState;
  commerceConfigured: boolean;
  close: () => void;
  addToCart: (productSlug: string) => void;
  updateQuantity: (productSlug: string, delta: number) => void;
  checkout: () => void;
}) {
  return (
    <>
      <button
        className={`cart-backdrop ${cartOpen ? "open" : ""}`}
        type="button"
        aria-label="Close cart"
        onClick={close}
      />
      <aside className={`cart-drawer ${cartOpen ? "open" : ""}`} aria-label="Shopping cart" aria-hidden={!cartOpen}>
        <div className="cart-header">
          <div>
            <p>Your cart</p>
            <h2>{cart.length ? "Casi listo" : "Your cart is empty"}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close cart" onClick={close}>
            <X size={22} />
          </button>
        </div>

        {!cart.length ? (
          <div className="empty-cart">
            <img src="/brand/corillo-pulpa-scene.png" alt="" />
            <p>Start with a juice, a shot, or the MVP sample bundle.</p>
            <a className="button primary wide" href="#products" onClick={close}>
              Continue shopping
            </a>
          </div>
        ) : (
          <>
            <div className="cart-progress">
              <span>
                {remainingForDelivery > 0
                  ? `Add ${formatPrice(remainingForDelivery)} more for delivery priority`
                  : "Delivery priority unlocked"}
              </span>
              <div>
                <i style={{ width: `${Math.min(100, (total / 4500) * 100)}%` }} />
              </div>
            </div>
            <div className="cart-items">
              {lines.map(({ product, quantity }) => (
                <div className="cart-item" key={product.slug}>
                  <ProductImage product={product} />
                  <div>
                    <h3>{product.name}</h3>
                    <p>{product.size}</p>
                    <span>{formatPrice(product.priceCents * quantity)}</span>
                  </div>
                  <div className="quantity-control">
                    <button
                      type="button"
                      aria-label={`Remove one ${product.name}`}
                      onClick={() => updateQuantity(product.slug, -1)}
                    >
                      <Minus size={15} />
                    </button>
                    <span>{quantity}</span>
                    <button type="button" aria-label={`Add one ${product.name}`} onClick={() => updateQuantity(product.slug, 1)}>
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-addons">
              <button className="drawer-section-title" type="button">
                Add a little extra <ChevronDown size={17} />
              </button>
              {addOns.map((addOn) => (
                <div className="addon" key={addOn.slug}>
                  <ProductImage product={addOn} />
                  <div>
                    <strong>{addOn.name}</strong>
                    <span>{formatPrice(addOn.priceCents)}</span>
                  </div>
                  <button type="button" onClick={() => addToCart(addOn.slug)}>
                    Add
                  </button>
                </div>
              ))}
            </div>
            <div className="cart-footer">
              <label className="drawer-email">
                <span>Email for receipt</span>
                <input
                  type="email"
                  value={customerEmail}
                  placeholder="you@example.com"
                  onChange={(event) => setCustomerEmail(event.target.value)}
                />
              </label>
              <div>
                <span>
                  {bottles} bottle item{bottles === 1 ? "" : "s"}
                </span>
                <strong>{formatPrice(total)}</strong>
              </div>
              <button
                className="checkout-button"
                type="button"
                disabled={!commerceConfigured || checkoutState.status === "loading"}
                onClick={checkout}
              >
                {checkoutState.status === "loading" ? "Reserving..." : "Check out"}
              </button>
              <p className={`checkout-status ${checkoutState.status}`}>{checkoutState.message}</p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
