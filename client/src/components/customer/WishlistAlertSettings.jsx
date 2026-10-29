import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {Button,Checkbox,EmptyState} from '../ui/index';
import UiIcon from '../common/UiIcon';
import useRealtimeRevision from '../../hooks/useRealtimeRevision';
import {apiAssetUrl} from '../../services/apiClient';
import {getWishlistAlertPreferences,getWishlistAlerts,saveWishlistAlertPreferences} from '../../services/wishlistService';

const toggles=[
  {key:'backInStock',label:'Back in stock',help:'When a saved product becomes available again'},
  {key:'priceDrop',label:'Price drops',help:'When the price of a saved product decreases'},
  {key:'saleStart',label:'Sale alerts',help:'When a saved product goes on sale'}
];
const defaults={backInStock:true,priceDrop:true,saleStart:true};

export default function WishlistAlertSettings(){
  const [prefs,setPrefs]=useState(defaults);
  const [alerts,setAlerts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const revision=useRealtimeRevision(['wishlist','notifications']);
  useEffect(()=>{
    const controller=new AbortController();
    async function refresh(){
      try{
        const [settings,history]=await Promise.all([
          getWishlistAlertPreferences(controller.signal),getWishlistAlerts(controller.signal)
        ]);
        if(controller.signal.aborted)return;
        setPrefs(settings.preferences||defaults);
        setAlerts(history.alerts||[]);
        setError('');
      }catch(e){if(!controller.signal.aborted)setError(e.message||'Wishlist alerts are unavailable.');}
      finally{if(!controller.signal.aborted)setLoading(false);}
    }
    refresh();return()=>controller.abort();
  },[revision]);
  async function change(key,checked){
    if(saving)return;
    const next={...prefs,[key]:checked};
    setSaving(true);setError('');
    try{const result=await saveWishlistAlertPreferences(next);setPrefs(result.preferences||next);}
    catch(e){setError(e.message||'Could not update alert preferences.');}
    finally{setSaving(false);}
  }
  return <section className="nx91-alerts" aria-label="Wishlist alert preferences">
    <div className="nx91-alerts-heading"><div><h2><UiIcon name="heart" size={19}/> Wishlist alerts</h2><p>Get notified about changes to products you saved. Alerts appear in your notification bell.</p></div></div>
    {error&&<p className="store-alert" role="alert">{error}</p>}
    <div className="nx91-alert-options" aria-busy={saving}>
      {toggles.map(item=><label className="nx91-alert-option" key={item.key}>
        <span><strong>{item.label}</strong><small>{item.help}</small></span>
        <Checkbox checked={Boolean(prefs[item.key])} disabled={loading||saving} onChange={e=>change(item.key,e.target.checked)} aria-label={item.label}/>
      </label>)}
    </div>
    <div className="nx91-alert-history"><h3>Recent wishlist alerts</h3>
      {loading?<p>Loading alerts…</p>:alerts.length===0?
        <EmptyState icon="check-circle" title="No wishlist alerts yet" description="When a saved product changes price, stock or sale status, the update will appear here."/>:
        <div className="nx91-alert-list">{alerts.map(alert=><Link to={alert.path} className="nx91-alert-item" key={alert.id}>
          {alert.imageUrl?<img src={apiAssetUrl(alert.imageUrl)} alt="" loading="lazy"/>:<span className="nx91-alert-placeholder"><UiIcon name="heart"/></span>}
          <span className="nx91-alert-detail"><strong>{alert.title}</strong><span>{alert.message}</span><small>{new Date(alert.created_at).toLocaleString('en-IN')}</small></span>
          <UiIcon name="chevron-right" size={17}/>
        </Link>)}</div>}
      {alerts.length>0&&<p className="nx91-alert-footnote">View or mark alerts as read using the notification bell.</p>}
    </div>
  </section>;
}
