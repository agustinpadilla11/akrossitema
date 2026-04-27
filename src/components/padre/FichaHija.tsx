import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useParams, Link } from 'react-router-dom';
import { isBefore, addDays } from 'date-fns';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function FichaHija() {
  const { id } = useParams();
  const [alumna, setAlumna] = useState<any>(null);
  const [cuotas, setCuotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCuota, setSelectedCuota] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const docSnap = await getDoc(doc(db, 'alumnas', id as string));
        if (docSnap.exists()) {
          setAlumna({ id: docSnap.id, ...docSnap.data() });
        }
        
        const today = new Date();
        const cSnap = await getDocs(query(
          collection(db, 'cuotas'),
          where('alumna_id', '==', id),
          where('anio', '==', today.getFullYear())
        ));
        setCuotas(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) return <div>Cargando...</div>;
  if (!alumna) return <div>No encontrada</div>;

  const today = new Date();
  const in30Days = addDays(today, 30);
  
  let aptoStatus = 'vencido';
  if (alumna.fecha_apto_medico) {
    const aptoDate = alumna.fecha_apto_medico.toDate();
    if (isBefore(today, aptoDate)) {
      if (isBefore(aptoDate, in30Days)) {
        aptoStatus = 'vencer';
      } else {
        aptoStatus = 'vigente';
      }
    }
  } else {
    aptoStatus = 'falta';
  }

  const currentMonth = today.getMonth() + 1;
  const missingMonths = [];
  const unpaidRecords = [];
  
  if (currentMonth >= 5) {
      for (let m = 5; m <= currentMonth; m++) {
          const c = cuotas.find(x => x.mes === m);
          if (!c) {
              if (m < currentMonth || today.getDate() > 15) {
                 missingMonths.push(MESES[m-1]);
              }
          } else if (c.estado !== 'pagado') {
              if (m < currentMonth || today.getDate() > 15 || c.estado === 'vencido') {
                 unpaidRecords.push(MESES[m-1]);
              }
          }
      }
  }

  const hasDebts = missingMonths.length > 0 || unpaidRecords.length > 0;

  return (
    <div className="space-y-8">
      {hasDebts && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex gap-3 shadow-sm">
           <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
           <div>
             <h3 className="text-sm font-bold text-red-800 uppercase tracking-tight">Atención: Cuota Vencida</h3>
             <p className="text-xs text-red-700 font-medium mt-1">Registramos deuda para los meses de: {[...unpaidRecords, ...missingMonths].join(', ')}. Recuerde que pasada la fecha de vencimiento (día 15) aplican recargos.</p>
           </div>
        </div>
      )}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-sm font-bold uppercase tracking-tight">{alumna.nombre_completo}</h1>
        <Link to="/portal" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-purple-600 underline">Volver</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 col-span-1 border-t-4 border-t-purple-600">
          {alumna.foto_gimnasta_url && (
            <div className="mb-6 flex justify-center">
              <img src={alumna.foto_gimnasta_url} alt={alumna.nombre_completo} className="w-24 h-24 rounded-full object-cover border-4 border-purple-100" />
            </div>
          )}
          <h2 className="text-sm font-bold uppercase tracking-tight mb-4">Datos</h2>
          <div className="space-y-4 text-xs font-bold uppercase">
            <p><span className="text-slate-400 block tracking-widest mb-1 text-[10px]">DNI</span> {alumna.dni}</p>
            <p><span className="text-slate-400 block tracking-widest mb-1 text-[10px]">Fecha Nac.</span> {alumna.fecha_nacimiento ? alumna.fecha_nacimiento.toDate().toLocaleDateString('es-AR') : '-'}</p>
            <p><span className="text-slate-400 block tracking-widest mb-1 text-[10px]">Estado</span> {alumna.estado}</p>
          </div>
          
          <div className="mt-8 border-t border-slate-100 pt-6">
            <h2 className="text-sm font-bold uppercase tracking-tight mb-4">Inscripción</h2>
            <div className="space-y-4 text-xs font-bold uppercase">
              <p><span className="text-slate-400 block tracking-widest mb-1 text-[10px]">Padre</span> {alumna.nombre_padre || '-'}</p>
              <p><span className="text-slate-400 block tracking-widest mb-1 text-[10px]">Madre</span> {alumna.nombre_madre || '-'}</p>
              <p><span className="text-slate-400 block tracking-widest mb-1 text-[10px]">Teléfonos</span> {alumna.telefono_padre || '-'} / {alumna.telefono_madre || '-'}</p>
              <p><span className="text-slate-400 block tracking-widest mb-1 text-[10px]">Domicilio</span> {alumna.domicilio || '-'}</p>
              <p><span className="text-slate-400 block tracking-widest mb-1 text-[10px]">Contacto Urgencia</span> {alumna.contacto_urgencia || '-'}</p>
              <p><span className="text-slate-400 block tracking-widest mb-1 text-[10px]">Obra Social</span> {alumna.obra_social || '-'} {alumna.numero_obra_social ? `(${alumna.numero_obra_social})` : ''}</p>
            </div>
            <Link to={`/portal/inscripcion?editAlumnaId=${alumna.id}`} className="block mt-6 text-center bg-purple-100 text-purple-700 px-4 py-3 rounded text-[10px] font-bold uppercase tracking-wide hover:bg-purple-200 transition-colors">
              Actualizar
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 col-span-2 space-y-8">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-tight mb-4 flex items-center justify-between border-b border-slate-100 pb-2">
              Apto Médico
              {aptoStatus === 'vigente' && <span className="bg-emerald-100 border-emerald-200 border text-emerald-700 px-3 py-1 rounded text-[10px] flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Vigente</span>}
              {aptoStatus === 'vencer' && <span className="bg-amber-100 border-amber-200 border text-amber-700 px-3 py-1 rounded text-[10px] flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Vence pronto</span>}
              {aptoStatus === 'vencido' && <span className="bg-red-100 border-red-200 border text-red-700 px-3 py-1 rounded text-[10px] flex items-center gap-1"><XCircle className="w-3 h-3"/> Vencido</span>}
              {aptoStatus === 'falta' && <span className="bg-slate-100 border border-slate-200 text-slate-500 px-3 py-1 rounded text-[10px] flex items-center gap-1"><AlertCircle className="w-3 h-3"/> No entregado</span>}
            </h2>
            <p className="text-xs font-bold uppercase text-slate-500 mb-4">
              {alumna.fecha_apto_medico ? `Vence el ${alumna.fecha_apto_medico.toDate().toLocaleDateString('es-AR')}` : 'Aún no has presentado el apto médico.'}
            </p>
            <Link to={`/portal/inscripcion?editAlumnaId=${alumna.id}`} className="inline-block bg-purple-100 text-purple-700 px-4 py-2 rounded text-[10px] font-bold uppercase tracking-wide hover:bg-purple-200 transition-colors mt-2">
              Actualizar Apto Médico
            </Link>
          </div>

          <div>
            <h2 className="text-sm font-bold uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">Estado de Cuotas {today.getFullYear()}</h2>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
              {MESES.map((m, idx) => {
                const mesIndex = idx + 1;
                const isExento = mesIndex < 5; // Jan to Apr exempt
                const c = cuotas.find(x => x.mes === mesIndex);
                
                if (isExento) {
                  return (
                    <div key={m} className="p-3 border rounded text-center bg-slate-50 border-slate-200">
                      <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">{m}</div>
                      <div className="text-[10px] font-black text-slate-400 mt-1">EXENTO</div>
                    </div>
                  );
                }

                if (!c) {
                  const currentMonth = today.getMonth() + 1;
                  const isCurrent = mesIndex === currentMonth;
                  const isOverdue = mesIndex < currentMonth;
                  
                  return (
                    <div key={m} className={`flex flex-col justify-between p-3 border rounded text-center ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                      <div>
                        <div className={`text-[10px] uppercase font-bold tracking-widest mb-1 ${isOverdue ? 'text-red-700' : 'text-slate-400'}`}>{m}</div>
                        <div className={`text-[10px] font-black mt-1 ${isOverdue ? 'text-red-700' : 'text-slate-300'}`}>
                          {isOverdue ? 'VENCIDO' : '-'}
                        </div>
                      </div>
                      {(isOverdue || isCurrent) && (
                        <button
                            onClick={() => setSelectedCuota({ mes: mesIndex, estado: isOverdue ? 'vencido' : 'pendiente', monto: 0, monthName: m })}
                            className={`mt-2 text-[9px] uppercase tracking-widest font-bold underline underline-offset-2 ${
                              isOverdue ? 'text-red-700 hover:text-red-900' : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            Detalle
                        </button>
                      )}
                    </div>
                  );
                }
                
                const isPagado = c.estado === 'pagado';
                const isVencido = c.estado === 'vencido';

                return (
                  <div key={m} className={`relative flex flex-col justify-between p-3 border rounded text-center shrink-0 ${
                    isPagado ? 'bg-emerald-50 border-emerald-200' :
                    isVencido ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                  }`}>
                    <div>
                      <div className={`text-[10px] uppercase font-bold tracking-widest mb-1 ${
                        isPagado ? 'text-emerald-700' : isVencido ? 'text-red-700' : 'text-amber-700'
                      }`}>{m}</div>
                      <div className={`text-[10px] font-black mt-1 ${
                        isPagado ? 'text-emerald-700' : isVencido ? 'text-red-700' : 'text-amber-700'
                      }`}>
                        {isPagado ? 'PAGADO' : isVencido ? 'VENCIDO' : 'PDTE'}
                      </div>
                    </div>
                    {(isPagado || isVencido || c.estado === 'pendiente') && (
                        <button
                          onClick={() => setSelectedCuota({ ...c, monthName: m })}
                          className={`mt-2 text-[9px] uppercase tracking-widest font-bold underline underline-offset-2 ${
                            isPagado ? 'text-emerald-700 hover:text-emerald-900' :
                            isVencido ? 'text-red-700 hover:text-red-900' : 'text-amber-700 hover:text-amber-900'
                          }`}
                        >
                          Detalle
                        </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {selectedCuota && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h3 className="font-black text-sm uppercase tracking-tight text-slate-800">Detalle de Cuota - {selectedCuota.monthName}</h3>
               <button onClick={() => setSelectedCuota(null)} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="w-5 h-5" />
               </button>
            </div>
            <div className="p-6 space-y-4">
               <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-widest">Estado</label>
                  <p className={`font-medium text-sm mt-1 uppercase ${
                    selectedCuota.estado === 'pagado' ? 'text-emerald-700' :
                    selectedCuota.estado === 'vencido' ? 'text-red-700' : 'text-amber-700'
                  }`}>
                    {selectedCuota.estado === 'pagado' ? 'Pagado' : selectedCuota.estado === 'vencido' ? 'Vencido' : 'Pendiente'}
                  </p>
               </div>
               {selectedCuota.estado === 'pagado' && (
                 <>
                   <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-widest">Fecha de Pago</label>
                      <p className="font-medium text-sm mt-1">{selectedCuota.fecha_pago ? (selectedCuota.fecha_pago.toDate ? selectedCuota.fecha_pago.toDate().toLocaleDateString('es-AR') : new Date(selectedCuota.fecha_pago).toLocaleDateString('es-AR')) : 'No disponible'}</p>
                   </div>
                   <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-widest">Método</label>
                      <p className="font-medium text-sm mt-1 capitalize">{selectedCuota.metodo_pago?.replace('_', ' ') || 'No especificado'}</p>
                   </div>
                 </>
               )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button 
                onClick={() => setSelectedCuota(null)}
                className="w-full py-2 bg-slate-800 text-white rounded font-bold uppercase tracking-widest text-xs hover:bg-slate-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
