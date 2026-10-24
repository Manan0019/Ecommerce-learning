import useRealtimeRevision from "../../hooks/useRealtimeRevision";
import {useEffect,useState} from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import EarningsLedger from '../../components/delivery/EarningsLedger';
import {getDeliveryStaff} from '../../services/deliveryService';

export default function AdminFinance(){
 const [staff,setStaff]=useState([]),[error,setError]=useState('');
 const liveRevision=useRealtimeRevision(['finance', 'delivery']);
 useEffect(()=>{const controller=new AbortController();getDeliveryStaff(controller.signal).then(r=>setStaff(r.staff||[])).catch(e=>{if(!controller.signal.aborted)setError(e.message)});return()=>controller.abort()},[liveRevision]);
 return <AdminLayout title="Finance & delivery payouts" subtitle="Review payment collections, COD balances and delivery executive compensation in one place.">
  {error&&<p className="admin-alert" role="alert">{error}</p>}
  <EarningsLedger admin staff={staff}/>
 </AdminLayout>;
}
