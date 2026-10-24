import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Button, ClearFilters, DataTable, EntityTitle, FormField, IconActionGroup, IconButton, Pagination, SearchField, Select, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, TextField } from '../src/components/ui/index';
import Modal from '../src/components/common/Modal';
import usePagination from '../src/hooks/usePagination';
import '../src/styles/site.css';

function Fixture() {
  const [query,setQuery]=useState('');
  const [records,setRecords]=useState(Array.from({length:23},(_,index)=>({id:index+1,name:`Product ${index+1}`})));
  const [modal,setModal]=useState(false);
  const [choice,setChoice]=useState('all');
  const [submitted,setSubmitted]=useState('');
  const pager=usePagination(records.filter(item=>item.name.includes(query)),query);
  return <main style={{maxWidth:1200,margin:'auto',padding:16}}>
    <h1>Nexora shared controls</h1>
    {['admin-shell','storefront','auth-shell','nx57-delivery-shell'].map(workspace=><section key={workspace} className={workspace} style={{display:'block',minHeight:0,padding:16,marginBottom:12}} data-workspace={workspace}>
      <h2>{workspace}</h2><div className="nx77-table-toolbar" style={{display:'flex',flexWrap:'wrap',gap:12}}>
        <SearchField label={`Search ${workspace}`} value={query} onChange={e=>setQuery(e.target.value)}/>
        <Select label={`Status ${workspace}`} value={choice} onChange={e=>setChoice(e.target.value)}><option value="all">All products</option><option value="active">Active</option></Select>
        <ClearFilters active={Boolean(query)||choice!=='all'} onClear={()=>{setQuery('');setChoice('all');}}/>
        <Button type="button" variant="primary" onClick={()=>setModal(true)}>Edit product</Button>
      </div>
    </section>)}
    <div className="admin-shell" style={{display:'block',minHeight:0}}>
      <TableContainer label="Fixture products"><DataTable><TableHead><TableRow><TableHeader>Product</TableHeader><TableHeader>Actions</TableHeader></TableRow></TableHead>
        <TableBody>{pager.items.map(item=><TableRow key={item.id}><TableCell><EntityTitle>{item.name}</EntityTitle></TableCell><TableCell actions><IconActionGroup>
          <IconButton icon="eye" label={`View ${item.name}`}/><IconButton icon="edit" label={`Edit ${item.name}`}/><IconButton icon="ban" label={`Disable ${item.name}`}/><Button type="button">SALE</Button><IconButton icon="trash" label={`Delete ${item.name}`} variant="danger" onClick={()=>setRecords(old=>old.filter(row=>row.id!==item.id))}/>
        </IconActionGroup></TableCell></TableRow>)}</TableBody></DataTable></TableContainer>
      <Pagination {...pager} onPageChange={pager.setPage}/>
      <Button type="button" data-testid="live-refresh" onClick={()=>setRecords(old=>old.map(row=>({...row})))}>Simulate live refresh</Button>
      <Button type="button" data-testid="shrink" onClick={()=>setRecords(old=>old.slice(0,11))}>Shrink collection</Button>
      <Button type="button" data-testid="grow" onClick={()=>setRecords(Array.from({length:23},(_,index)=>({id:index+1,name:`Product ${index+1}`})))}>Restore collection</Button>
    </div>
    {modal&&<Modal title="Edit a product" size="small" onClose={()=>setModal(false)}><form onSubmit={e=>{e.preventDefault();setSubmitted(new FormData(e.currentTarget).get('name'));}}>
      <FormField label="Product name"><TextField name="name" required defaultValue="Draft product"/></FormField>
      <Select label="Category" name="category" required><option>Electronics</option><option>Home</option></Select>
      <TextField label="Invalid example" error="Enter a valid value" value="" readOnly/>
      <Button type="submit" variant="primary">Save changes</Button><output>{submitted}</output>
    </form></Modal>}
  </main>;
}
createRoot(document.getElementById('root')).render(<MemoryRouter><Fixture/></MemoryRouter>);
