import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {SITE_NAME,SITE_TAGLINE} from '../../config/site';
import BrandLogo from '../common/BrandLogo';
import {apiAssetUrl} from '../../services/apiClient';
import {getFooterContent} from '../../services/footerService';
const fallback={headlinePrimary:'GOOD THINGS,',headlineAccent:'FOUND HERE.',tickerItems:['NEXORA','DISCOVER','CHOOSE','LOVE YOUR FINDS'],artworkUrl:null};
export default function StoreFooter(){
 const [content,setContent]=useState(fallback);
 useEffect(()=>{const controller=new AbortController();getFooterContent(controller.signal).then(d=>{if(d.footer)setContent(d.footer);}).catch(()=>{});return()=>controller.abort();},[]);
 const items=Array.isArray(content.tickerItems)&&content.tickerItems.length?content.tickerItems:fallback.tickerItems;
 // Identical halves allow a seamless loop. Each half is independently long enough to fill the viewport.
 const group=<span className="nx62-ticker-group">{[...items,...items,...items].map((phrase,i)=><span className="nx62-ticker-word" key={i}>{phrase}<span aria-hidden="true" className="nx62-ticker-spark">✦</span></span>)}</span>;
 return <footer className="store-footer nx34-footer">
   <div className="nx34-footer-top nx62-footer-top"><span className="nx34-footer-index">N / 001</span>
     <p>{content.headlinePrimary} <em>{content.headlineAccent}</em></p>
     {content.artworkUrl?<img className="nx62-footer-art" src={apiAssetUrl(content.artworkUrl)} alt="Nexora footer artwork"/>:<span className="nx34-footer-star" aria-hidden="true">✳</span>}
   </div>
   <div className="nx61-footer-marquee nx62-footer-marquee" aria-label={items.join(' · ')}><div className="nx62-ticker-track" aria-hidden="true">{group}{group}</div></div>
   <div className="nx34-footer-main">
     <div className="nx34-footer-about"><Link className="brand footer-brand" to="/"><BrandLogo showIcon={false}/></Link><p>{SITE_TAGLINE}</p><span>Explore thoughtfully. Shop confidently.</span></div>
     <nav aria-label="Explore Nexora" className="nx34-footer-nav"><strong>DISCOVER</strong><Link to="/products">All products</Link><Link to="/categories">Collections</Link><Link to="/wishlist">Saved favourites</Link><Link to="/compare">Compare products</Link></nav>
     <nav aria-label="Your account" className="nx34-footer-nav"><strong>YOUR SPACE</strong><Link to="/dashboard">Your account</Link><Link to="/orders">Orders</Link><Link to="/addresses">Addresses</Link></nav>
     <nav aria-label="About and contact" className="nx34-footer-nav"><strong>THE DETAILS</strong><Link to="/about">Our story</Link><Link to="/contact">Contact</Link><Link to="/faq">FAQs</Link></nav>
   </div>
   <div className="nx34-footer-bottom"><span>© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</span><span>MADE FOR THE CURIOUS <span aria-hidden="true">✦</span></span></div>
 </footer>;
}
