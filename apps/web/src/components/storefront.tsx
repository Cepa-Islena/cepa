"use client";

import type { CSSProperties, FormEvent } from "react";
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
import { useContactForm, type ContactState } from "@/hooks/use-contact-form";
import { useDeliveryChecker } from "@/hooks/use-delivery-checker";
import { useStorefrontCart } from "@/hooks/use-storefront-cart";
import { useStorefrontCatalog } from "@/hooks/use-storefront-catalog";
import { useStorefrontCheckout, type CheckoutState } from "@/hooks/use-storefront-checkout";
import { useStorefrontNavigation } from "@/hooks/use-storefront-navigation";
import { addOns, metroPueblos, products, products as staticProducts, type CartItem, type Product, type ProductKind } from "@/lib/catalog";
import { formatPrice, remaining, type CartLine, type QuizAnswers } from "@/lib/commerce";

type StorefrontProps = {
  commerceConfigured: boolean;
  catalogProducts?: Product[];
  catalogSource?: "supabase" | "static";
};

function cardStyle(variable: "--card-color" | "--spotlight-color", color: string): CSSProperties {
  return { [variable]: color } as CSSProperties;
}

function ProductImage({ product }: { product: Product }) {
  return <img src={product.image} alt="" loading="lazy" />;
}

export function Storefront({
  commerceConfigured,
  catalogProducts = staticProducts,
  catalogSource = "static",
}: StorefrontProps) {
  const {
    cart,
    cartOpen,
    lines,
    total,
    bottles,
    produce,
    itemCount,
    openCart,
    closeCart,
    addToCart,
    updateQuantity,
  } = useStorefrontCart();
  const { mobileNavOpen, closeMobileNav, toggleMobileNav, scrollToSection } = useStorefrontNavigation();
  const {
    activeKind,
    setActiveKind,
    selectedProduct,
    searchQuery,
    setSearchQuery,
    quizAnswers,
    setQuizAnswers,
    visibleProducts,
    recommended,
    currentDropRemaining,
    selectProduct,
  } = useStorefrontCatalog(catalogProducts);
  const { deliveryTown, setDeliveryTown, metro } = useDeliveryChecker();
  const {
    customerEmail,
    setCustomerEmail,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    deliveryAddress,
    setDeliveryAddress,
    deliveryNotes,
    setDeliveryNotes,
    giftNote,
    setGiftNote,
    checkoutState,
    checkout,
  } = useStorefrontCheckout(commerceConfigured);
  const { contactState, submitContact } = useContactForm();

  return (
    <div className="site-shell cepa-store">
      <div className="announcement">
        <span>Delivery en SJ metro</span>
        <span>Cold pressed by drop</span>
        <span>Sin azúcar añadida</span>
      </div>

      <header className="site-header">
        <button
          className="icon-button mobile-menu"
          type="button"
          aria-label="Open menu"
          aria-expanded={mobileNavOpen}
          onClick={toggleMobileNav}
        >
          <Menu size={22} />
        </button>
        <nav className="nav-links left-nav" aria-label="Main navigation">
          <a
            href="#about"
            onClick={(event) => {
              event.preventDefault();
              scrollToSection("about");
            }}
          >
            Story
          </a>
          <a
            href="#delivery"
            onClick={(event) => {
              event.preventDefault();
              scrollToSection("delivery");
            }}
          >
            Delivery
          </a>
        </nav>
        <a className="brand-mark" href="#shop" aria-label="Cepa Isleña home">
          <img src="/brand/logo-borra.png" alt="Cepa Isleña" />
        </a>
        <div className="header-right">
          <nav className="nav-links" aria-label="Secondary navigation">
            <a
              href="#products"
              onClick={(event) => {
                event.preventDefault();
                scrollToSection("products");
              }}
            >
              Shop
            </a>
            <a
              href="#contact"
              onClick={(event) => {
                event.preventDefault();
                scrollToSection("contact");
              }}
            >
              Contact
            </a>
          </nav>
          <button className="cart-button" type="button" onClick={openCart}>
            <ShoppingBag size={18} /> Cart <span>{itemCount}</span>
          </button>
        </div>
      </header>

      {mobileNavOpen ? (
        <MobileNav selectProduct={selectProduct} close={closeMobileNav} scrollToSection={scrollToSection} />
      ) : null}

      <main>
        <section className="shop-hero" id="shop">
          <div className="hero-media" aria-hidden="true">
            <video
              className="hero-video"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster="/brand/video/hero-poster.jpg"
            >
              <source src="/brand/video/hero-loop.mp4" type="video/mp4" />
            </video>
            <div className="hero-scrim" />
          </div>
          <div className="hero-copy">
            <p className="eyebrow">SJ, PR · Jugos verdes y shots</p>
            <h1>An island juice worth the ritual.</h1>
            <p>
              Bright, cold-pressed flavors for metro San Juan. Not medical advice — just a ritual worth coming back
              for.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#products">
                Shop now <ArrowRight size={18} />
              </a>
              <button className="button secondary" type="button" onClick={() => addToCart("mvp-sample-bundle")}>
                Try the sample pack
              </button>
            </div>
            <div className="hero-proof">
              <span>100% natural</span>
              <span>Made to order</span>
              <span>Metro delivery</span>
            </div>
          </div>
        </section>

        <section className="flavor-row" aria-label="Flavor notes">
          <span>Parcha</span>
          <span>Acerola</span>
          <span>Piña menta</span>
          <span>Tamarindo</span>
          <span>Jengibre</span>
        </section>

        <section className="editorial-band" aria-label="Brand statement">
          <div className="editorial-band-inner">
            <h2>“Pleasure to be sipped by you.”</h2>
            <p>
              Begin your afternoon with Cepa — small-batch juices and shots pressed for the corillo. Fresh flavor
              first, island character always.
            </p>
            <a className="button primary" href="#products">
              Shop Cepa
            </a>
          </div>
        </section>

        <section className="serve-section" aria-label="Signature serve">
          <div>
            <p>The signature serve</p>
            <h2>Shake well. Sip cold. Share the bag.</h2>
            <div className="serve-steps">
              <article>
                <strong>1</strong>
                <span>Pick your juice, shot, or sample pack.</span>
              </article>
              <article>
                <strong>2</strong>
                <span>We deliver your bag to metro San Juan.</span>
              </article>
              <article>
                <strong>3</strong>
                <span>Keep it cold, shake well, and sip fresh.</span>
              </article>
            </div>
          </div>
          <div className="serve-visual">
            <img src="/brand/corillo-pulpa-scene.png" alt="Cepa corillo characters" />
          </div>
        </section>

        <section className="shop-section" id="products">
          <div className="section-heading">
            <div>
              <p>Shop the drop</p>
              <h2>Flavors made to reorder.</h2>
            </div>
            <div className="filters" aria-label="Product filters">
              {[
                ["all", "All"],
                ["juice", "Juices"],
                ["shot", "Shots"],
                ["bundle", "Bundle"],
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

          {visibleProducts.length ? (
            <div className="product-grid">
              {visibleProducts.map((product) => (
                <ProductCard key={product.slug} product={product} addToCart={addToCart} selectProduct={selectProduct} />
              ))}
            </div>
          ) : (
            <div className="no-results">
              <h3>No products found</h3>
              <p>Try juices, shots, or the sample pack.</p>
            </div>
          )}
        </section>

        <section className="bundle-feature" id="bundles">
          <div className="bundle-art">
            <img src="/brand/corillo-logo-scene.png" alt="Cepa Corillo illustration" />
          </div>
          <div className="bundle-copy">
            <p>Best first buy</p>
            <h2>MVP Sample Bundle</h2>
            <span className="price-lockup">$22 · 5 flavors</span>
            <p>One pack. Every launch flavor. The easiest way to fall in love with Cepa.</p>
            <ul>
              {products[5].components.map((component) => (
                <li key={component.recipeSlug}>
                  <span>{component.recipeName}</span>
                  <span>{component.ounces} oz</span>
                </li>
              ))}
            </ul>
            <button className="button primary" type="button" onClick={() => addToCart("mvp-sample-bundle")}>
              Add sample pack
            </button>
          </div>
        </section>

        <section className="story-band" id="about">
          <div className="story-band-inner">
            <p>La Cepa</p>
            <h2>Aquí nadie crece solo.</h2>
            <p>
              Local fruit, small drops, and a brand that feels like Puerto Rico — intentional, playful, and hard to
              forget after the first bottle.
            </p>
            <div className="story-points">
              <span>100% natural</span>
              <span>Cold pressed by drop</span>
              <span>Metro San Juan</span>
            </div>
          </div>
        </section>

        <DeliverySection deliveryTown={deliveryTown} setDeliveryTown={setDeliveryTown} metro={metro} />
        <ContactSection contactState={contactState} submitContact={submitContact} />
      </main>

      <Footer catalogSource={catalogSource} />
      <CartDrawer
        cartOpen={cartOpen}
        cart={cart}
        lines={lines}
        total={total}
        bottles={bottles}
        customerEmail={customerEmail}
        setCustomerEmail={setCustomerEmail}
        customerName={customerName}
        setCustomerName={setCustomerName}
        customerPhone={customerPhone}
        setCustomerPhone={setCustomerPhone}
        deliveryAddress={deliveryAddress}
        setDeliveryAddress={setDeliveryAddress}
        deliveryNotes={deliveryNotes}
        setDeliveryNotes={setDeliveryNotes}
        giftNote={giftNote}
        setGiftNote={setGiftNote}
        checkoutState={checkoutState}
        commerceConfigured={commerceConfigured}
        close={closeCart}
        addToCart={addToCart}
        updateQuantity={updateQuantity}
        checkout={() => checkout({ cart, deliveryTown })}
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
        ["products", "Shop"],
        ["about", "Story"],
        ["delivery", "Delivery"],
        ["contact", "Contact"],
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
  return (
    <article className="product-card calm-card" style={cardStyle("--card-color", product.color)}>
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
        {product.ingredients.length ? (
          <p className="ingredient-line">
            <strong>Ingredients:</strong> {product.ingredients.join(", ")}
          </p>
        ) : null}
        {product.allergens.length ? (
          <p className="ingredient-line">
            <strong>Allergens:</strong> {product.allergens.join(", ")}
          </p>
        ) : (
          <p className="ingredient-line">
            <strong>Allergens:</strong> none listed for this MVP recipe — ask if you have concerns.
          </p>
        )}
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
          <h3>Jugo con intención.</h3>
          <p>Ofrecemos jugos verdes y shots 100% naturales, cold pressed en drops pequeños con sabor local.</p>
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
          <h3>What vibe do you want?</h3>
          <div className="quiz-options">
            {optionButton({
              selected: answers.nutrient === "daily-reset",
              label: "Daily reset",
              onClick: () => setAnswers({ ...answers, nutrient: "daily-reset" }),
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
        <p>Early feedback</p>
        <h2>Lo que dice el corillo.</h2>
        <p className="legal-note">Sample quotes for brand direction. Replace with real customer reviews before public launch ads.</p>
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

function Footer({ catalogSource }: { catalogSource: "supabase" | "static" }) {
  return (
    <footer className="footer">
      <div>
        <img src="/brand/logo-borra.png" alt="Cepa Isleña" />
        <p>Jugos verdes y shots hechos con frutas, manos y mucha intención.</p>
        <p className="legal-note">
          Not medical advice. Ingredient lists describe current MVP recipes and may change. Catalog source: {catalogSource}.
        </p>
      </div>
      <nav aria-label="Footer navigation">
        <a href="#shop">Home</a>
        <a href="#about">About Us</a>
        <a href="#products">Order</a>
        <a href="#quiz">Quiz</a>
        <a href="#contact">Contact</a>
      </nav>
      <nav aria-label="Legal">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/refunds">Refunds</a>
        <a href="/delivery">Delivery</a>
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
  customerEmail,
  setCustomerEmail,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  deliveryAddress,
  setDeliveryAddress,
  deliveryNotes,
  setDeliveryNotes,
  giftNote,
  setGiftNote,
  checkoutState,
  commerceConfigured,
  close,
  addToCart,
  updateQuantity,
  checkout,
}: {
  cartOpen: boolean;
  cart: CartItem[];
  lines: CartLine[];
  total: number;
  bottles: number;
  customerEmail: string;
  setCustomerEmail: (value: string) => void;
  customerName: string;
  setCustomerName: (value: string) => void;
  customerPhone: string;
  setCustomerPhone: (value: string) => void;
  deliveryAddress: string;
  setDeliveryAddress: (value: string) => void;
  deliveryNotes: string;
  setDeliveryNotes: (value: string) => void;
  giftNote: string;
  setGiftNote: (value: string) => void;
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
            <div className="cart-progress calm-cart-note">
              <span>Metro San Juan delivery · no minimum</span>
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
              <p className="cart-why-info">
                Just what we need to deliver your bag: name, phone, and address. Receipt email is optional.
              </p>
              <label className="drawer-email">
                <span>Name</span>
                <input
                  type="text"
                  value={customerName}
                  placeholder="Who should we deliver to?"
                  required
                  autoComplete="name"
                  onChange={(event) => setCustomerName(event.target.value)}
                />
              </label>
              <label className="drawer-email">
                <span>Phone</span>
                <input
                  type="tel"
                  value={customerPhone}
                  placeholder="For delivery day contact"
                  required
                  autoComplete="tel"
                  onChange={(event) => setCustomerPhone(event.target.value)}
                />
              </label>
              <label className="drawer-email">
                <span>Delivery address</span>
                <input
                  type="text"
                  value={deliveryAddress}
                  placeholder="Street, unit, pueblo"
                  required
                  autoComplete="street-address"
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                />
              </label>
              <label className="drawer-email">
                <span>Delivery notes (optional)</span>
                <input
                  type="text"
                  value={deliveryNotes}
                  placeholder="Gate code, floor, timing"
                  onChange={(event) => setDeliveryNotes(event.target.value)}
                />
              </label>
              <label className="drawer-email">
                <span>Email for receipt (optional)</span>
                <input
                  type="email"
                  value={customerEmail}
                  placeholder="you@example.com"
                  autoComplete="email"
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
              <p className="legal-note">
                By checking out you agree to our <a href="/terms">Terms</a>, <a href="/privacy">Privacy</a>, and{" "}
                <a href="/delivery">Delivery</a> policies.
              </p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
