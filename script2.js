function switchOscarCat(cat){
    window._adminOscarCat=cat;
    document.querySelectorAll('.admin-oscar-cat-btn').forEach(b=>b.classList.toggle('active',b.dataset.cat===cat));
    document.getElementById('admOscarYear').value='';
    document.getElementById('admOscarReleaseYear').value='';
    document.getElementById('admOscarTitle').value='';
    document.getElementById('admOscarGenre').value='';
    document.getElementById('admOscarPoster').value='';
    document.getElementById('admOscarPosition').value='';
    renderAdminOscarList();
}
async function renderAdminOscarList(){
    const container=document.getElementById('adminOscarList');
    container.innerHTML='<div style="text-align:center;padding:20px;color:#9ca3af;">⏳ جاري التحميل...</div>';
    try{
        const{data,error}=await supabaseClient.from('oscar_movies').select('*').eq('category',window._adminOscarCat).eq('in_trash',false).order('ceremony_year',{ascending:false}).order('position',{ascending:true});
        if(error) throw error;
        if(!data||data.length===0){container.innerHTML='<div style="text-align:center;padding:20px;color:#9ca3af;">لا يوجد أفلام.</div>';return;}
        let html='';
        let currentYear=null;
        let serialNum=0;
        data.forEach(m=>{
            if(currentYear===null||m.ceremony_year!==currentYear){
                currentYear=m.ceremony_year;
                serialNum=1;
            }else{
                serialNum++;
            }
            html+=`<div class="admin-oscar-item">
                <div class="admin-movie-info">
                    <img src="${m.poster_url||'https://placehold.co/40x60/333/fff'}" class="admin-movie-poster" onerror="this.src='https://placehold.co/40x60/333/fff'">
                    <div>
                        <div class="admin-movie-title">${m.is_winner?'<span class="winner-tag">🏆 WINNER</span>':''}${escapeHtml(m.title)}</div>
                        <div class="admin-movie-meta">${m.ceremony_year} • ${m.release_year||'—'} • ${escapeHtml(m.genre||'')}</div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                    <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="deleteOscarMovie('${m.id}', this)">حذف</button>
                    <span style="font-size:0.8rem;font-weight:900;color:#bf953f;min-width:22px;text-align:center;background:rgba(191,149,63,.15);border:1px solid rgba(191,149,63,.4);border-radius:4px;padding:2px 6px;">${serialNum}</span>
                </div>
            </div>`;
        });
        container.innerHTML=html;
    }catch(e){container.innerHTML='<div style="text-align:center;padding:20px;color:#ef4444;">❌ '+escapeHtml(e.message)+'</div>';}
}
async function deleteOscarMovie(id,btnEl){
    showCustomConfirm('حذف هذا الفيلم؟','سيُنقل إلى Content Trash.','نعم',async()=>{
        const res=await deleteContent('oscar_movie',id,{title:'Oscar'});
        if(res.success){
            showToast('🗑️ نُقل إلى Trash','');
            if(btnEl) btnEl.closest('.admin-oscar-item').remove();
            updateContentTrashCount();
            await loadOscarFromDB();
            renderOscarModals();
        }else{showToast('❌ فشل',res.error);}
    });
}
async function addOscarMovie(){
    const year=document.getElementById('admOscarYear').value.trim();
    const releaseYear=document.getElementById('admOscarReleaseYear').value.trim();
    const title=document.getElementById('admOscarTitle').value.trim();
    const genre=document.getElementById('admOscarGenre').value.trim();
    const isWinner=document.getElementById('admOscarWinner').value==='true';
    const positionRaw=document.getElementById('admOscarPosition').value.trim();
    const poster=document.getElementById('admOscarPoster').value.trim();
    
    if(!year||!title){showToast('⚠️ السنة والعنوان مطلوبان','');return;}
    if(!poster){ showToast('⚠️ البوستر مطلوب','الرجاء رفع صورة أو وضع رابط قبل الإضافة'); return; }
    
    showToast('⏳ Saving...','');
    try{
        const {data: existing} = await supabaseClient.from('oscar_movies')
            .select('id, is_winner')
            .eq('category', window._adminOscarCat)
            .eq('ceremony_year', parseInt(year))
            .eq('in_trash', false);
            
        if(existing){
            const isDuplicate = existing.some(m => (m.title||'').toLowerCase() === title.toLowerCase());
        }
        
        const {data: allExisting} = await supabaseClient.from('oscar_movies')
            .select('title, is_winner')
            .eq('category', window._adminOscarCat)
            .eq('ceremony_year', parseInt(year))
            .eq('in_trash', false);
            
        if(allExisting){
            const isDuplicate = allExisting.some(m => (m.title||'').trim().toLowerCase() === title.trim().toLowerCase());
            if(isDuplicate){
                showToast('⚠️ هذا الفيلم موجود بالفعل في هذه السنة والقسم','');
                return;
            }
            if(isWinner){
                const winnerExists = allExisting.some(m => m.is_winner === true);
                if(winnerExists){
                    showToast('⚠️ يوجد فائز مسجل بالفعل لهذه السنة','لا يمكن إضافة فائزين اثنين');
                    return;
                }
            }
        }
        let finalPosition = parseInt(positionRaw) || 0;
        if(positionRaw === ''){
            const {data: maxPos} = await supabaseClient.from('oscar_movies')
                .select('position')
                .eq('category', window._adminOscarCat)
                .eq('ceremony_year', parseInt(year))
                .eq('in_trash', false)
                .order('position', {ascending: false})
                .limit(1);
            finalPosition = (maxPos && maxPos[0] && maxPos[0].position != null) ? maxPos[0].position + 1 : 0;
        }
        const{error}=await supabaseClient.from('oscar_movies').insert([{
            ceremony_year:parseInt(year),
            release_year:releaseYear?parseInt(releaseYear):null,
            title:title,
            genre:genre,
            poster_url:poster,
            is_winner:isWinner,
            category:window._adminOscarCat,
            position:finalPosition,
            in_trash:false
        }]);
        
        if(error) throw error;
        showToast('✅ تمت الإضافة','');
        document.getElementById('admOscarYear').value='';
        document.getElementById('admOscarReleaseYear').value='';
        document.getElementById('admOscarTitle').value='';
        document.getElementById('admOscarGenre').value='';
        document.getElementById('admOscarPoster').value='';
        document.getElementById('admOscarPosition').value='';
        
        await loadOscarFromDB();
        renderOscarModals();
        renderAdminOscarList();
    }catch(e){showToast('❌ فشل',e.message||'');}
}
async function loadOscarFromDB(){
    try{
        const{data,error}=await supabaseClient.from('oscar_movies').select('*').eq('in_trash',false).order('ceremony_year',{ascending:false}).order('position',{ascending:true});
        if(error)throw error;
        if(!data||data.length===0)throw new Error("Empty");
        D={};S2={};AS2={};IF={};AF={};
        
        const seen = new Set();
        data.forEach(row=>{
            const year=row.ceremony_year;
            const uniqueKey = `${row.category}|${year}|${(row.title||'').trim().toLowerCase()}`;
            if(seen.has(uniqueKey)) return;
            seen.add(uniqueKey);
            const movieData={id:row.id,t:row.title,y:row.release_year,g:row.genre,p:row.poster_url,w:row.is_winner?1:0,trailer:row.trailer_url};
            if(row.category==='picture'){if(!D[year])D[year]=[];D[year].push(movieData);}
            else if(row.category==='screenplay'){if(!S2[year])S2[year]=[];S2[year].push(movieData);}
            else if(row.category==='adapted'){if(!AS2[year])AS2[year]=[];AS2[year].push(movieData);}
            else if(row.category==='international'){if(!IF[year])IF[year]=[];IF[year].push(movieData);}
            else if(row.category==='animated'){if(!AF[year])AF[year]=[];AF[year].push(movieData);}
        });
        const sortWinnersFirst = (obj) => {
            Object.keys(obj).forEach(year => {
                obj[year].sort((a, b) => {
                    if (a.w === 1 && b.w === 0) return -1;
                    if (a.w === 0 && b.w === 1) return 1;
                    return 0; 
                });
            });
        };
        sortWinnersFirst(D);
        sortWinnersFirst(S2);
        sortWinnersFirst(AS2);
        sortWinnersFirst(IF);
        sortWinnersFirst(AF);
    }catch(e){
        console.error(e);
    }
}
async function loadMarqueeFromDB(){try{const{data,error}=await supabaseClient.from('marquee_messages').select('id, text').eq('is_active',true).eq('in_trash',false).order('display_order',{ascending:true});if(error)throw error;if(data&&data.length>0){const mT=data.map(d=>d.text).join('<sep>')+'<sep>';MC.innerHTML=mT.repeat(2).split('<sep>').map(t=>t.trim()?`${t}<span class="marquee-separator">Tomo .com</span>`:'').join('');Array.from(DD.children).forEach(c=>{if(c.id!=='closeMenuBtn')c.remove();});DD.insertAdjacentHTML('beforeend',`<button class="marquee-add-btn" onclick="event.stopPropagation();openAddMarquee()">➕ Add New Message</button>`);const html=data.map(d=>{return `<div class="marquee-msg-row"><p>${d.text}</p><div class="marquee-msg-actions"><button class="edit-marquee-btn" onclick="event.stopPropagation();openEditMarquee('${d.id}')">✏️</button><button onclick="event.stopPropagation();softDeleteMarquee('${d.id}')">✕</button></div></div><div class="dropdown-separator"><span class="tomo-badge">Tomo</span></div>`;}).join('');DD.insertAdjacentHTML('beforeend',html);}}catch(e){console.error(e);}}
async function loadHeaderMediaFromDB(){
    try{
        if(rotInt)clearInterval(rotInt);
        let{data,error}=await supabaseClient.from('header_media').select('*').order('square_index').order('face_order');
        if(error)throw error;
        if(!data||data.length===0){
            const toInsert=[];
            for(let i=0;i<NS;i++){
                for(let j=0;j<NF;j++){
                    toInsert.push({media_type:'image',media_url:SF[i%SF.length][j%SF[0].length]||`https://picsum.photos/seed/s${i+1}f${j+1}/300`,square_index:i,face_order:j,is_active:true});
                }
            }
            await supabaseClient.from('header_media').insert(toInsert);
            const refetch=await supabaseClient.from('header_media').select('*').order('square_index').order('face_order');
            data=refetch.data;
        }
        const fullMap=Array.from({length:NS},()=>Array(NF).fill(null));
        data.forEach(item=>{
            if(item.square_index<NS&&item.face_order<NF){
                fullMap[item.square_index][item.face_order]={id:item.id,url:item.media_url,type:item.media_type,in_trash:item.in_trash===true};
            }
        });
        const finalSF=Array.from({length:NS},()=>Array(NF).fill(null));
        for(let i=0;i<NS;i++){
            for(let j=0;j<NF;j++){
                const entry=fullMap[i][j];
                if(entry){
                    if(entry.in_trash){
                        finalSF[i][j]=null;
                    } else {
                        finalSF[i][j]={id:entry.id,url:entry.url,type:entry.type};
                    }
                } else {
                    finalSF[i][j]=null;
                }
            }
        }
        renderHeaderSquares(finalSF);
    }catch(e){console.error(e);}
}
function renderHeaderSquares(sfData){
    const container=document.getElementById('yellowSquaresContainer');
    container.innerHTML=Array.from({length:NS},(_,i)=>{
        const[bg,brd]=PC[i%PC.length];
        return`<div class="square-wrapper" data-sid="${i}"><div class="flat-square" data-id="${i}" data-c="0" style="--face-bg:${bg};--face-border:${brd}">${Array.from({length:NF},(_,j)=>{
            const item=sfData[i]?sfData[i][j]:null;
            let cls='face';
            let cd='',type='none',dbId='';
            if(item){
                cd=item.url;
                type=item.type;
                dbId=item.id||'';
            }
            let cc='';
            if(type==='video'){
                cc=`<video class="face-img" src="${cd}" autoplay muted loop playsinline></video>`;
            }else if(type==='image'){
                cc=`<img class="face-img" src="${cd}" onerror="this.src='https://placehold.co/300x300/333/fff'">`;
            }else{
                cc=`<div style="width:100%;height:100%;background:#111"></div>`;
            }
            if(j===0)cls+=' square-image-face active';
            return`<div class="${cls}" data-f="${j}" data-t="${type}" data-d="${cd}" data-db-id="${dbId}" data-valid="${!!item}">${cc}<div class="absolute bottom-1 right-1 text-gray-200 text-xs font-bold opacity-50">#${mL(i,j)+1}</div></div>`;
        }).join('')}</div><div class="admin-delete-btn" onclick="event.stopPropagation(); event.preventDefault(); deleteHeaderImageFromSquare(this); return false;" style="top:-2px;right:-2px;z-index:999;width:24px;height:24px;font-size:14px;">✕</div></div>`;
    }).join('');
    SQ=document.querySelectorAll('.flat-square');
    WR=document.querySelectorAll('.square-wrapper');
    zS=0;stp=0;
    document.querySelectorAll('.flat-square').forEach(w=>w.onclick=e=>{
        e.stopPropagation();
        if(isM)return;
        const f=w.querySelector('.face.active'),s=w;
        if(f&&s){
            STR();
            TM('paused');
            curG=mL(parseInt(s.dataset.id),parseInt(s.dataset.c));
            UM(f.dataset.t,f.dataset.d,curG);
            MO.classList.add('active');
            isM=true;
            currentZoomDbId=f.dataset.dbId;
            if(isCurrentUserAdmin() && f.dataset.valid==='true' && currentZoomDbId){
                document.getElementById('btnDeleteSquaresZoom').style.display='flex';
            }else{
                document.getElementById('btnDeleteSquaresZoom').style.display='none';
            }
        }
    });
    if(rotInt)clearInterval(rotInt);
    SR();
    ZN();
}
const HM=()=>{MO.classList.remove('active');isM=false;curG=-1;SR();TM('running');document.getElementById('btnDeleteSquaresZoom').style.display='none';};
const UM=(t,d,g)=>{
    MI.style.display=MT.style.display='none';
    SC.textContent=`${g+1}/${TOTAL}`;
    if(t==='image'){
        MI.src=d;MI.style.display='block';
    }else if(t==='none'){
        MI.style.display='none';
        MT.innerHTML=`<div class="flex flex-col items-center justify-center h-full w-full" style="background:#1a1a2e;color:#9ca3af;font-size:1.2rem;">Empty Slot</div>`;
        MT.style.display='flex';
    }else{
        MT.innerHTML=`<div class="flex flex-col items-center justify-center h-full w-full"><span class="text-sm font-black text-red-700">${d}</span></div>`;
        MT.style.display='flex';
    }
};
const NG=dir=>{
    if(!isM||curG===-1)return;
    let nId=(curG+dir+TOTAL)%TOTAL;
    const{s:os}=mG(curG),{s:ns,f:nf}=mG(nId),oSq=SQ[os],nSq=SQ[ns];
    if(oSq){const f=oSq.querySelector('.face.active');if(f){f.classList.remove('active');if(os!==ns)f.style.opacity='0'}}
    if(nSq){const f=nSq.querySelector(`.face[data-f="${nf}"]`);if(f){
        if(os!==ns){f.style.opacity='1';f.style.transform='translateX(0)'}else{f.style.transform=`translateX(${dir>0?100:-100}%)`;f.style.opacity='0';setTimeout(()=>f.style.cssText='transform:translateX(0);opacity:1',50)}
        f.classList.add('active');
        nSq.dataset.c=nf;
        UM(f.dataset.t,f.dataset.d,nId);
        curG=nId;
        currentZoomDbId=f.dataset.dbId;
        if(isCurrentUserAdmin() && f.dataset.valid==='true' && currentZoomDbId){
            document.getElementById('btnDeleteSquaresZoom').style.display='flex';
        }else{
            document.getElementById('btnDeleteSquaresZoom').style.display='none';
        }
    }}
};
[MO,MI,MT].forEach(e=>e.onclick=ev=>{if(ev.target===MO||e!==MO)HM()});
PA.onclick=e=>{e.stopPropagation();NG(-1)};NA.onclick=e=>{e.stopPropagation();NG(1)};
document.getElementById('btnCloseSquaresZoom').addEventListener('click',function(e){e.stopPropagation();HM()});
document.getElementById('btnDeleteSquaresZoom').addEventListener('click',function(e){e.stopPropagation();if(currentZoomDbId){softDeleteHeaderImage(currentZoomDbId);}else{showToast('⚠️','Image ID missing.');}});
const rot=()=>{if(stp<7){const pair=SP[stp];if(pair){pair.forEach(idx=>{const sq=SQ[idx],cur=parseInt(sq.dataset.c),fs=sq.querySelectorAll('.face');let nxt=(cur+1)%NF;let attempts=0;while(fs[nxt].dataset.valid==='false'&&attempts<NF){nxt=(nxt+1)%NF;attempts++;}if(attempts>=NF)return;fs[cur].style.cssText='transform:translateX(-100%);opacity:0';fs[cur].classList.remove('active');fs[nxt].style.cssText='transform:translateX(100%);opacity:0';fs[nxt].classList.add('active');setTimeout(()=>fs[nxt].style.cssText='transform:translateX(0);opacity:1',50);sq.dataset.c=nxt;});}}stp++;if(stp>=8){stp=0;ZN()}};
const SR=()=>{rotInt=rotInt||setInterval(rot,500)};const STR=()=>{clearInterval(rotInt);rotInt=null};
let ZW=null,zS=0;
const UZ=()=>{if(ZW){ZW.classList.remove('is-zoomed-sq');ZW=null}};
const ZN=()=>{UZ();const w=WR[zS];if(w){w.classList.add('is-zoomed-sq');ZW=w}zS=(zS+1)%NS};
async function ensureValidSession(){try{const{data:{session}}=await supabaseClient.auth.getSession();if(!session||!session.user)return null;const now=Math.floor(Date.now()/1000);const expiresAt=session.expires_at||0;const secondsLeft=expiresAt-now;if(secondsLeft<120){const{data:refreshData,error}=await supabaseClient.auth.refreshSession();if(error||!refreshData.session){return null;}return refreshData.session;}return session;}catch(e){return null;}}
function closeOptionsDropdown(){document.getElementById('optionsDropdown').classList.remove('active')}
function openModal(type){closeOptionsDropdown();clearAllActive();['bestPictureModal','screenplayModal','adaptedScreenplayModal','internationalModal','animatedFeatureModal','tomoPageModal'].forEach(id=>document.getElementById(id).style.display='none');TH.style.display='none';let modalId,catIdx,title;if(type==='picture'){modalId='bestPictureModal';catIdx=0;title='Best Picture Winners & Nominees'}else if(type==='screenplay'){modalId='screenplayModal';catIdx=1;title='Best Original Screenplay'}else if(type==='adapted'){modalId='adaptedScreenplayModal';catIdx=2;title='Best Adapted Screenplay'}else if(type==='international'){modalId='internationalModal';catIdx=3;title='Best International Feature'}else{modalId='animatedFeatureModal';catIdx=4;title='Best Animated Feature'}document.getElementById(modalId).style.display='flex';document.querySelectorAll('.category-row').forEach(r=>{r.classList.remove('active-cat','picture','screenplay','adapted','international','animated')});const cr=document.querySelectorAll('.category-row')[catIdx];cr.classList.add('active-cat');cr.classList.add(type);FH.classList.remove('picture','screenplay','adapted','international','animated');FH.classList.add(type);FH.style.display='flex';document.getElementById('floatingHeaderSub').innerHTML=title+' <span class="archive-tag">ARCHIVE</span>';document.getElementById('floatingCloseBtn').onclick=closeModal}
function closeModal(){clearAllActive();['bestPictureModal','screenplayModal','adaptedScreenplayModal','internationalModal','animatedFeatureModal'].forEach(id=>document.getElementById(id).style.display='none');FH.style.display='none';FH.classList.remove('picture','screenplay','adapted','international','animated')}
function openOscarZoom(y,i,type){closeOptionsDropdown();SL.style.display='none';Z=y;X=i;window._currentZoomType=type;let n;if(type==='screenplay')n=S2[y];else if(type==='adapted')n=AS2[y];else if(type==='international')n=IF[y];else if(type==='animated')n=AF[y];else n=D[y];const movie=n[i];currentZoomedMovie={title:movie.t,subtitle:'',year:movie.y,genre:movie.g,poster:movie.p,trailer:movie.trailer};saveLastZoomed(currentZoomedMovie);document.getElementById('zoomedImgOscar').src=movie.p;document.getElementById('zoomCounterOscar').textContent=`${i+1}/${n.length}`;document.getElementById('zoomOverlayOscar').classList.add('active');document.getElementById('zmTitle').textContent=movie.t;document.getElementById('zmMeta').textContent=`${movie.y} • ${movie.g}`;document.getElementById('zoomedDetails').style.display='block'}
function closeOscarZoom(){document.getElementById('zoomOverlayOscar').classList.remove('active');document.getElementById('zoomedDetails').style.display='none';SL.style.display='none'}
function navOscarZoom(d){let n;if(window._currentZoomType==='screenplay')n=S2[Z];else if(window._currentZoomType==='adapted')n=AS2[Z];else if(window._currentZoomType==='international')n=IF[Z];else if(window._currentZoomType==='animated')n=AF[Z];else n=D[Z];X=(X+d+n.length)%n.length;const movie=n[X];currentZoomedMovie={title:movie.t,subtitle:'',year:movie.y,genre:movie.g,poster:movie.p,trailer:movie.trailer};saveLastZoomed(currentZoomedMovie);document.getElementById('zoomedImgOscar').src=movie.p;document.getElementById('zoomCounterOscar').textContent=`${X+1}/${n.length}`;document.getElementById('zmTitle').textContent=movie.t;document.getElementById('zmMeta').textContent=`${movie.y} • ${movie.g}`;document.getElementById('zoomedDetails').style.display='block'}
function openMyPage(){if(!isLoggedIn){showToast('🔒 Sign in','');openLoginModal();return}closeOptionsDropdown();clearAllActive();MB.classList.add('active-mypage');['bestPictureModal','screenplayModal','adaptedScreenplayModal','internationalModal','animatedFeatureModal'].forEach(id=>document.getElementById(id).style.display='none');FH.style.display='none';FH.classList.remove('picture','screenplay','adapted','international','animated');document.getElementById('tomoPageModal').style.display='flex';TH.style.display='flex';renderMyPage()}
function closeTomoPage(){document.getElementById('tomoPageModal').style.display='none';TH.style.display='none';MB.classList.remove('active-mypage');if(!isLoggedIn){showToast('💡 Sign up free','');openLoginModal()}}
function clearAllActive(){document.querySelectorAll('.category-row').forEach(r=>{r.classList.remove('active-cat','picture','screenplay','adapted','international','animated')});MB.classList.remove('active-mypage')}
function showToast(m,s,position='center-center'){const existing=document.querySelector('.toast-message');if(existing)existing.remove();const toast=document.createElement('div');toast.className='toast-message';if(position){toast.classList.add(position)}toast.innerHTML=m+(s?`<span class="toast-subtitle">${s}</span>`:'');document.body.appendChild(toast);setTimeout(()=>{toast.style.opacity='0';setTimeout(()=>toast.remove(),300)},3500)}
function waitForSession(){if(sessionReady)return Promise.resolve();return new Promise(r=>{const check=()=>sessionReady?r():setTimeout(check,200);check();setTimeout(r,5000);});}
function genOscarCards(data,containerId,zoomType){let H='';const years=Object.keys(data).sort((a,b)=>b-a);let yearIdx=0;for(let y of years){yearIdx++;let cls="year-card "+(parseInt(y)%2===0?'even':'odd')+' featured'+(yearIdx>3?' collapsed':''),yId='yc-'+containerId+'-'+y;H+=`<div class="${cls}" id="${yId}" onclick="event.stopPropagation();toggleYearCard('${yId}')"><span class="award-name">OSCAR NOMINATIONS</span><span class="year-label">${y}</span><div class="nominations-list">`;let winnerIdx=-1;data[y].forEach((m,i)=>{if(m.w&&winnerIdx===-1)winnerIdx=i});if(winnerIdx>=0){const winner=data[y][winnerIdx];const dBtn=(winner.id)?`<div class="admin-delete-btn" onclick="softDeleteOscar('${winner.id}', this, event)" style="top:2px;right:2px;z-index:100;">✕</div>`:'';H+=`<div class="bp-winner-row" onclick="event.stopPropagation()"><div class="bp-winner-poster" style="position:relative;" onclick="event.stopPropagation();openOscarZoom(${y},${winnerIdx},'${zoomType}')"><img src="${winner.p}" onerror="this.src='https://placehold.co/300x450/3b82f6/fff'">${dBtn}</div><div class="bp-winner-info"><span class="bp-winner-badge">WINNER</span><span class="bp-winner-title">${winner.t}</span><span class="bp-winner-year">${winner.y}</span><span class="bp-winner-genre">${winner.g.replace(/, /g,' • ')}</span><div class="movie-action-links"><span class="movie-action-link" data-action="ratings" data-title="${winner.t}" data-year="${winner.y}" data-poster="${winner.p}" data-genre="${winner.g}">⭐ My Ratings.</span><span class="movie-action-link" data-action="watchlater" data-title="${winner.t}" data-year="${winner.y}" data-poster="${winner.p}" data-genre="${winner.g}">📋 Watch Later</span></div></div></div>`;}H+=`<div class="bp-nominees-grid">`;data[y].forEach((m,i)=>{if(m.w)return;const dBtn=(m.id)?`<div class="admin-delete-btn" onclick="softDeleteOscar('${m.id}', this, event)" style="top:2px;right:2px;z-index:100;">✕</div>`:'';H+=`<div class="bp-nominee-card" onclick="event.stopPropagation()"><div class="bp-nominee-poster" style="position:relative;" onclick="event.stopPropagation();openOscarZoom(${y},${i},'${zoomType}')"><img src="${m.p}" onerror="this.src='https://placehold.co/300x450/3b82f6/fff'">${dBtn}</div><div class="bp-nominee-info"><span class="bp-nominee-num">#${i+1}</span><span class="bp-nominee-title">${m.t}</span><span class="bp-nominee-year">${m.y}</span><span class="bp-nominee-genre">${m.g.replace(/, /g,' • ')}</span><div class="movie-action-links"><span class="movie-action-link" data-action="ratings" data-title="${m.t}" data-year="${m.y}" data-poster="${m.p}" data-genre="${m.g}">⭐ My Ratings.</span><span class="movie-action-link" data-action="watchlater" data-title="${m.t}" data-year="${m.y}" data-poster="${m.p}" data-genre="${m.g}">📋 Watch Later</span></div></div></div>`;});H+=`</div>`;H+=`</div></div>`;}document.getElementById(containerId).innerHTML=H;attachMainActionEvents();}
function renderOscarModals(){genOscarCards(D,'modalMoviesListContainer','picture');genOscarCards(S2,'screenplayMoviesListContainer','screenplay');genOscarCards(AS2,'adaptedScreenplayMoviesListContainer','adapted');genOscarCards(IF,'internationalMoviesListContainer','international');genOscarCards(AF,'animatedFeatureMoviesListContainer','animated');}
function openAdminPanel(){if(!isUserAdmin)return;document.getElementById('adminPanelOverlay').classList.add('active');switchAdminTab('movies');updateAdminStats();renderAdminMoviesList();}
function closeAdminPanel(){document.getElementById('adminPanelOverlay').classList.remove('active');}
function switchAdminTab(tab){
    ['adminTabMovies','adminTabOscar','adminTabHeader','adminTabStats','adminTabUsers','adminTabModeration'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
    ['tabAdminMovies','tabAdminOscar','tabAdminHeader','tabAdminStats','tabAdminUsers','tabAdminModeration'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('active');});
    if(tab==='movies'){document.getElementById('adminTabMovies').style.display='block';document.getElementById('tabAdminMovies').classList.add('active');}
    else if(tab==='oscar'){document.getElementById('adminTabOscar').style.display='block';document.getElementById('tabAdminOscar').classList.add('active');renderAdminOscarList();}
    else if(tab==='header'){document.getElementById('adminTabHeader').style.display='block';document.getElementById('tabAdminHeader').classList.add('active');renderHeaderImagesManager();}
    else if(tab==='stats'){document.getElementById('adminTabStats').style.display='block';document.getElementById('tabAdminStats').classList.add('active');updateAdminStats();}
    else if(tab==='users'){document.getElementById('adminTabUsers').style.display='block';document.getElementById('tabAdminUsers').classList.add('active');renderAdminUsersList();}
    else if(tab==='moderation'){document.getElementById('adminTabModeration').style.display='block';document.getElementById('tabAdminModeration').classList.add('active');renderAdminCommentsList();}
}
async function updateAdminStats(){
    try{
        const[moviesRes,usersRes,listsRes,oscarRes]=await Promise.all([
            supabaseClient.from('movies').select('id',{count:'exact',head:true}).eq('is_active',true).eq('in_trash',false),
            supabaseClient.from('profiles').select('id',{count:'exact',head:true}),
            supabaseClient.from('published_lists').select('id',{count:'exact',head:true}).eq('is_active',true),
            supabaseClient.from('oscar_movies').select('id',{count:'exact',head:true}).eq('in_trash',false)
        ]);
        document.getElementById('statTotalMovies').textContent=moviesRes.count||0;
        document.getElementById('statTotalUsers').textContent=usersRes.count||0;
        document.getElementById('statTotalLists').textContent=listsRes.count||0;
        document.getElementById('statTotalOscar').textContent=oscarRes.count||0;
    }catch(e){console.error(e);}
}
async function renderAdminUsersList(){
    const container=document.getElementById('adminUsersList');
    container.innerHTML='<div style="text-align:center;padding:20px;color:#9ca3af;">⏳ جاري التحميل...</div>';
    try{
        const{data:users,error}=await supabaseClient.from('profiles').select('id, username, created_at').order('created_at',{ascending:false});
        if(error) throw error;
        if(!users||users.length===0){container.innerHTML='<div style="text-align:center;padding:20px;color:#9ca3af;">لا يوجد مستخدمون.</div>';return;}
        const userIds=users.map(u=>u.id);
        const[ratingsRes,listsRes]=await Promise.all([
            supabaseClient.from('ratings').select('user_id').in('user_id',userIds).eq('in_trash',false),
            supabaseClient.from('published_lists').select('user_id').in('user_id',userIds).eq('is_active',true)
        ]);
        const ratingsByUser={};(ratingsRes.data||[]).forEach(r=>{ratingsByUser[r.user_id]=(ratingsByUser[r.user_id]||0)+1;});
        const listsByUser={};(listsRes.data||[]).forEach(l=>{listsByUser[l.user_id]=(listsByUser[l.user_id]||0)+1;});
        container.innerHTML=users.map(u=>`<div class="admin-movie-item"><div class="admin-movie-info"><div style="width:40px;height:40px;border-radius:50%;background:#8b5cf6;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;color:#fff;flex-shrink:0;">${String(u.username||'U').charAt(0).toUpperCase()}</div><div><div class="admin-movie-title">${escapeHtml(u.username||'Unknown')}</div><div class="admin-movie-meta">⭐ ${ratingsByUser[u.id]||0} ratings • 📋 ${listsByUser[u.id]||0} lists</div></div></div></div>`).join('');
    }catch(e){container.innerHTML='<div style="text-align:center;padding:20px;color:#ef4444;">❌ '+escapeHtml(e.message||'')+'</div>';}
}
async function renderAdminCommentsList(){
    const container=document.getElementById('adminCommentsList');
    container.innerHTML='<div style="text-align:center;padding:20px;color:#9ca3af;">⏳ جاري التحميل...</div>';
    try{
        const{data:comments,error}=await supabaseClient.from('comments').select('id, user_id, list_id, text, created_at').order('created_at',{ascending:false}).limit(100);
        if(error) throw error;
        if(!comments||comments.length===0){container.innerHTML='<div style="text-align:center;padding:20px;color:#9ca3af;">لا يوجد تعليقات.</div>';return;}
        const userIds=[...new Set(comments.map(c=>c.user_id))];let nameById={};
        if(userIds.length){const{data:profs}=await supabaseClient.from('profiles').select('id, username').in('id',userIds);(profs||[]).forEach(p=>{nameById[p.id]=p.username;});}
        const listIds=[...new Set(comments.map(c=>c.list_id))];let listTitleById={};
        if(listIds.length){const{data:lists}=await supabaseClient.from('published_lists').select('id, title').in('id',listIds);(lists||[]).forEach(l=>{listTitleById[l.id]=l.title;});}
        container.innerHTML=comments.map(c=>{const author=nameById[c.user_id]||'Unknown';const listTitle=listTitleById[c.list_id]||'Deleted';return `<div class="admin-movie-item" style="align-items:flex-start;"><div class="admin-movie-info" style="flex:1;flex-direction:column;align-items:flex-start;gap:4px;"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;"><span class="admin-movie-title" style="color:#a78bfa;">${escapeHtml(author)}</span><span style="font-size:0.6rem;color:#9ca3af;">في</span><span style="font-size:0.65rem;color:#60a5fa;">"${escapeHtml(listTitle)}"</span></div><div style="font-size:0.7rem;color:#e5e7eb;line-height:1.4;word-break:break-word;">${escapeHtml(c.text)}</div><div class="admin-movie-meta">${formatDate(c.created_at)}</div></div><button class="admin-btn admin-btn-danger admin-btn-sm" onclick="adminDeleteComment('${c.id}', this)">حذف</button></div>`;}).join('');
    }catch(e){container.innerHTML='<div style="text-align:center;padding:20px;color:#ef4444;">❌ '+escapeHtml(e.message||'')+'</div>';}
}
async function adminDeleteComment(commentId,btnEl){
    showCustomConfirm('حذف هذا التعليق؟','','نعم، احذف',async()=>{
        try{const{error}=await supabaseClient.from('comments').delete().eq('id',commentId);if(error)throw error;showToast('🗑️ تم','');if(btnEl)btnEl.closest('.admin-movie-item').remove();}catch(e){showToast('❌ فشل',e.message||'');}
    });
}
function renderAdminMoviesList(){
    const container=document.getElementById('adminMoviesList');
    const searchInput=document.getElementById('adminMovieSearch');
    const query=searchInput?searchInput.value.trim().toLowerCase():'';
    let filtered=movieDB;
    if(query){filtered=movieDB.filter(m=>{const fullTitle=((m.title||'')+' '+(m.subtitle||'')).toLowerCase();return fullTitle.includes(query);});}
    let html='';
    filtered.slice(0,50).forEach(movie=>{
        const isSelected=window._adminSelectedMovies.has(movie.id);
        html+=`<div class="admin-movie-item"><input type="checkbox" class="bulk-check" ${isSelected?'checked':''} onchange="toggleAdminMovieSelect('${movie.id}', this)"><div class="admin-movie-info"><img src="${movie.poster}" class="admin-movie-poster" onerror="this.src='https://placehold.co/100x150/333/fff'"><div><div class="admin-movie-title">${escapeHtml(movie.title)} ${escapeHtml(movie.subtitle||'')}</div><div class="admin-movie-meta">${movie.year||''} • ${movie.genre||''} • <span style="color:#a78bfa">${movie.site_grade||'More'}</span></div></div></div><div style="display:flex;gap:5px;flex-shrink:0;"><button class="admin-btn admin-btn-sm" style="background:#3b82f6;color:#fff;" onclick="openEditMovieModal('${movie.id}')">✏️</button><button class="admin-btn admin-btn-danger admin-btn-sm" onclick="softDeleteMovie('${movie.id}', this, event)">🗑️</button></div></div>`;
    });
    container.innerHTML=html||`<div style="text-align:center;color:#888;padding:20px;">${query?'لا نتائج':'لا توجد أفلام.'}</div>`;
    updateBulkBar();
}
async function addNewMovieAdmin(){
    const title=document.getElementById('admMovieTitle').value.trim();
    const subtitle=document.getElementById('admMovieSubtitle').value.trim();
    const year=document.getElementById('admMovieYear').value.trim();
    const genre=document.getElementById('admMovieGenre').value.trim();
    const poster=document.getElementById('admMoviePoster').value.trim()||'https://placehold.co/300x450/2d3748/ffffff?text=New+Movie';
    const grade=document.getElementById('admMovieGrade').value;
    const positionRaw=document.getElementById('admMoviePosition').value.trim();
    if(!title){showToast('⚠️ اسم الفيلم مطلوب','');return;}
    showToast('⏳ Saving...','');
    try{
        let finalPosition;
        if(positionRaw===''){const{data:maxPos}=await supabaseClient.from('movies').select('site_position').eq('site_grade',grade).eq('is_active',true).eq('in_trash',false).order('site_position',{ascending:false}).limit(1);finalPosition=(maxPos&&maxPos[0]&&maxPos[0].site_position!=null)?maxPos[0].site_position+1:0;}else{finalPosition=parseInt(positionRaw)||0;}
        const{data,error}=await supabaseClient.from('movies').insert([{title:title,subtitle:subtitle,year:year,genre:genre,poster_url:poster,site_grade:grade,site_position:finalPosition,is_active:true}]).select();
        if(error) throw error;
        closeAdminPanel();
        await loadHomepageFromDB();
        showToast('✅ Added to '+grade,'');
        document.getElementById('admMovieTitle').value='';document.getElementById('admMovieSubtitle').value='';document.getElementById('admMovieYear').value='';document.getElementById('admMovieGenre').value='';document.getElementById('admMoviePoster').value='';document.getElementById('admMoviePosition').value='';
    }catch(error){showToast('❌ Failed',error.message);}
}
async function loadUserLibrary(){if(!currentUserId)return;try{const validSession=await ensureValidSession();if(!validSession)return;const{data:ratingsData,error:e1}=await supabaseClient.from('ratings').select('*').eq('user_id',currentUserId);if(e1)throw e1;const{data:wlData,error:e2}=await supabaseClient.from('watch_later').select('*').eq('user_id',currentUserId);if(e2)throw e2;myRatings=[];myWatchLater=[];trashBin=[];(ratingsData||[]).forEach(r=>{const movieObj={title:r.title,subtitle:r.subtitle||'',year:r.year,genre:r.genre||'',poster:r.poster};if(r.in_trash)trashBin.push({type:'rating',dbId:r.id,data:{movie:movieObj,rating:parseFloat(r.rating)}});else myRatings.push({dbId:r.id,movie:movieObj,rating:parseFloat(r.rating),position:r.position||0});});(wlData||[]).forEach(w=>{const movieObj={title:w.title,subtitle:w.subtitle||'',year:w.year,genre:w.genre||'',poster:w.poster};if(w.in_trash)trashBin.push({type:'watchlater',dbId:w.id,data:movieObj});else myWatchLater.push({dbId:w.id,...movieObj,position:w.position||0});});myRatings.sort((a,b)=>(a.position||0)-(b.position||0));myWatchLater.sort((a,b)=>(a.position||0)-(b.position||0));renderMyPage();updateTrashCount();if(document.getElementById('trashModalOverlay').classList.contains('active'))renderTrashModal();}catch(e){const msg=(e&&e.message)?e.message:'';if(msg.includes('JWT')||msg.includes('token')||msg.includes('401')){try{await supabaseClient.auth.signOut();}catch(err){}isLoggedIn=false;currentUser='';currentUserId='';updateLoginUI();showToast('🔒 Session expired','');}else{showToast('❌ '+(msg.substring(0,120)||'Error'),'');}}}
async function addToWatchLater(d){if(!sessionReady){showToast('⏳ Loading...','');await waitForSession();}if(myWatchLater.some(m=>m.title===d.title&&m.subtitle===d.subtitle&&m.year===d.year)){showToast('Already in Watch Later','⚠️');return;}if(!isLoggedIn){myWatchLater.push({title:d.title,subtitle:d.subtitle||'',year:d.year,genre:d.genre||'',poster:d.poster});showToast('Added','✅');if(document.getElementById('tomoPageModal').style.display==='flex')renderMyPage();return;}const validSession=await ensureValidSession();if(!validSession){showToast('🔒 Expired','');try{await supabaseClient.auth.signOut();}catch(e){}isLoggedIn=false;currentUser='';currentUserId='';updateLoginUI();return;}const maxPos=myWatchLater.reduce((max,m)=>Math.max(max,m.position||0),-1);const newPosition=maxPos+1;const tempItem={title:d.title,subtitle:d.subtitle||'',year:d.year,genre:d.genre||'',poster:d.poster,position:newPosition};myWatchLater.push(tempItem);if(document.getElementById('tomoPageModal').style.display==='flex')renderMyPage();try{const{data,error}=await supabaseClient.from('watch_later').insert([{user_id:currentUserId,title:d.title,subtitle:d.subtitle||'',year:d.year,genre:d.genre||'',poster:d.poster,position:newPosition,in_trash:false}]).select();if(error)throw error;if(data&&data[0])tempItem.dbId=data[0].id;showToast('Added','✅');}catch(e){const i=myWatchLater.indexOf(tempItem);if(i>=0)myWatchLater.splice(i,1);if(document.getElementById('tomoPageModal').style.display==='flex')renderMyPage();showToast('❌ '+(e.message?e.message.substring(0,120):'Failed'),'');}}
function openRatingPopup(d){if(!isLoggedIn){pendingLoginAction=()=>openRatingPopup(d);openLoginModal();return;}currentRatingMovie=d;document.body.classList.add('rating-open');const popup=document.getElementById('ratingPopupPoster');popup.src=d.poster;popup.onerror=()=>popup.src='https://placehold.co/300x450/2d3748/ffffff?text=Movie';document.getElementById('ratingPopupTitle').textContent=(d.title+' '+(d.subtitle||'')).trim();document.getElementById('ratingPopupYear').textContent=d.year;document.getElementById('ratingPopupInput').value='';document.getElementById('ratingPopupSubmit').classList.remove('active');document.getElementById('ratingPopupOverlay').classList.add('active');document.getElementById('ratingPopupInput').focus()}
function closeRatingPopup(){document.body.classList.remove('rating-open');document.getElementById('ratingPopupOverlay').classList.remove('active');currentRatingMovie=null;window._editingRatingIndex=undefined}
async function submitRating(){if(!sessionReady){showToast('⏳ Loading...','');await waitForSession();}if(!currentRatingMovie)return;const val=parseFloat(document.getElementById('ratingPopupInput').value);if(isNaN(val)||val<0.1||val>10){showToast('Enter 0.1-10','⚠️');return;}const rounded=Math.round(val*10)/10;if(isLoggedIn){const validSession=await ensureValidSession();if(!validSession){showToast('🔒 Expired','');try{await supabaseClient.auth.signOut();}catch(e){}isLoggedIn=false;currentUser='';currentUserId='';updateLoginUI();return;}}if(window._editingRatingIndex!==undefined){const item=myRatings[window._editingRatingIndex];const oldRating=item.rating;item.rating=rounded;showToast('Updated','✏️');if(isLoggedIn&&item.dbId){try{const{error}=await supabaseClient.from('ratings').update({rating:rounded}).eq('id',item.dbId);if(error)throw error;}catch(e){item.rating=oldRating;showToast('❌ Failed','');}}window._editingRatingIndex=undefined;}else{const idx=myRatings.findIndex(r=>r.movie.title===currentRatingMovie.title&&r.movie.subtitle===currentRatingMovie.subtitle&&r.movie.year===currentRatingMovie.year);if(idx>=0){const item=myRatings[idx];const oldRating=item.rating;item.rating=rounded;showToast('Updated','✏️');if(isLoggedIn&&item.dbId){try{const{error}=await supabaseClient.from('ratings').update({rating:rounded}).eq('id',item.dbId);if(error)throw error;}catch(e){item.rating=oldRating;showToast('❌ Failed','');}}}else{const maxPos=myRatings.reduce((max,r)=>Math.max(max,r.position||0),-1);const newPosition=maxPos+1;const tempItem={movie:{title:currentRatingMovie.title,subtitle:currentRatingMovie.subtitle||'',year:currentRatingMovie.year,genre:currentRatingMovie.genre||'',poster:currentRatingMovie.poster},rating:rounded,position:newPosition};myRatings.push(tempItem);showToast('Added','⭐');if(isLoggedIn){try{const{data,error}=await supabaseClient.from('ratings').insert([{user_id:currentUserId,title:currentRatingMovie.title,subtitle:currentRatingMovie.subtitle||'',year:currentRatingMovie.year,genre:currentRatingMovie.genre||'',poster:currentRatingMovie.poster,rating:rounded,position:newPosition,in_trash:false}]).select();if(error)throw error;if(data&&data[0])tempItem.dbId=data[0].id;}catch(e){const i=myRatings.indexOf(tempItem);if(i>=0)myRatings.splice(i,1);showToast('❌ Failed','');}}}}closeRatingPopup();if(document.getElementById('tomoPageModal').style.display==='flex')renderMyPage();}
function openConfirmDialog(type,index,movieName){pendingDelete={type,index};document.getElementById('confirmMovieName').textContent=movieName;document.getElementById('confirmOverlay').classList.add('active')}
function closeConfirmDialog(){document.getElementById('confirmOverlay').classList.remove('active');pendingDelete=null}
async function executeDelete(){if(!pendingDelete)return;if(isLoggedIn){const validSession=await ensureValidSession();if(!validSession){showToast('🔒 Expired','');return;}}if(pendingDelete.type==='watchlater'){const movie=myWatchLater[pendingDelete.index];myWatchLater.splice(pendingDelete.index,1);trashBin.push({type:'watchlater',dbId:movie.dbId,data:{...movie}});showToast('Moved to Trash','🗑️');if(isLoggedIn&&movie.dbId){try{const{error}=await supabaseClient.from('watch_later').update({in_trash:true}).eq('id',movie.dbId);if(error)throw error;}catch(e){}}}else if(pendingDelete.type==='rating'){const sorted=[...myRatings].sort((a,b)=>b.rating-a.rating);const item=sorted[pendingDelete.index];const origIdx=myRatings.findIndex(r=>r.movie.title===item.movie.title&&r.movie.subtitle===item.movie.subtitle&&r.movie.year===item.movie.year);if(origIdx>=0){const removed=myRatings.splice(origIdx,1)[0];trashBin.push({type:'rating',dbId:removed.dbId,data:{...removed}});showToast('Moved to Trash','🗑️');if(isLoggedIn&&removed.dbId){try{const{error}=await supabaseClient.from('ratings').update({in_trash:true}).eq('id',removed.dbId);if(error)throw error;}catch(e){}}}}closeConfirmDialog();updateTrashCount();renderMyPage();if(document.getElementById('trashModalOverlay').classList.contains('active'))renderTrashModal();}
async function restoreFromTrash(index){const item=trashBin[index];if(!item)return;if(isLoggedIn){const validSession=await ensureValidSession();if(!validSession){showToast('🔒','');return;}}if(item.type==='watchlater'){myWatchLater.push({...item.data,dbId:item.dbId});showToast('Restored','↻');if(isLoggedIn&&item.dbId){try{const{error}=await supabaseClient.from('watch_later').update({in_trash:false}).eq('id',item.dbId);if(error)throw error;}catch(e){}}}else if(item.type==='rating'){myRatings.push({...item.data,dbId:item.dbId});showToast('Restored','↻');if(isLoggedIn&&item.dbId){try{const{error}=await supabaseClient.from('ratings').update({in_trash:false}).eq('id',item.dbId);if(error)throw error;}catch(e){}}}trashBin.splice(index,1);updateTrashCount();renderMyPage();renderTrashModal();}
async function deleteFromTrash(index){const item=trashBin[index];if(!item)return;if(isLoggedIn){const validSession=await ensureValidSession();if(!validSession){showToast('🔒','');return;}}if(isLoggedIn&&item.dbId){try{const table=item.type==='watchlater'?'watch_later':'ratings';const{error}=await supabaseClient.from(table).delete().eq('id',item.dbId);if(error)throw error;}catch(e){showToast('❌ '+(e.message?e.message.substring(0,120):'Failed'),'');return;}}trashBin.splice(index,1);showToast('Permanently deleted','❌');updateTrashCount();renderTrashModal();}
async function emptyTrash(){if(trashBin.length===0)return;if(isLoggedIn){const validSession=await ensureValidSession();if(!validSession){showToast('🔒','');return;}try{const{error:e1}=await supabaseClient.from('ratings').delete().eq('user_id',currentUserId).eq('in_trash',true);if(e1)throw e1;const{error:e2}=await supabaseClient.from('watch_later').delete().eq('user_id',currentUserId).eq('in_trash',true);if(e2)throw e2;}catch(e){showToast('❌ '+(e.message?e.message.substring(0,120):'Failed'),'');return;}}trashBin=[];showToast('Emptied','🗑️');updateTrashCount();renderTrashModal();}
function updateTrashCount(){document.getElementById('trashCount').textContent=trashBin.length;document.getElementById('trashModalCount').textContent=trashBin.length;const badge=document.querySelector('.trash-icon-btn .trash-badge');if(badge){badge.textContent=trashBin.length;if(trashBin.length===0){badge.classList.add('hidden')}else{badge.classList.remove('hidden')}}}
function openTrashModal(){closeOptionsDropdown();document.getElementById('trashModalOverlay').classList.add('active');renderTrashModal()}
function closeTrashModal(){document.getElementById('trashModalOverlay').classList.remove('active')}
function renderTrashModal(){const body=document.getElementById('trashModalBody'),footer=document.getElementById('trashModalFooter');updateTrashCount();if(trashBin.length===0){body.innerHTML='<div class="trash-modal-empty">Trash is empty</div>';footer.style.display='none'}else{let html='';trashBin.forEach((item,i)=>{let title='',poster='',typeClass='',typeLabel='',meta='';if(item.type==='watchlater'){title=item.data.title+' '+item.data.subtitle;poster=item.data.poster;typeClass='type-wl';typeLabel='Watch Later';meta=(item.data.year||'')+' • '+(item.data.genre||'')}else{title=item.data.movie.title+' '+item.data.movie.subtitle;poster=item.data.movie.poster;typeClass='type-rating';typeLabel='⭐ '+item.data.rating+'/10';meta=(item.data.movie.year||'')+' • '+(item.data.movie.genre||'')}html+=`<div class="trash-modal-item"><img class="trash-item-poster" src="${poster}" onerror="this.src='https://placehold.co/300x450/2d3748/ffffff?text=Movie'"><div class="trash-item-info"><div class="trash-item-title">${title}</div><div class="trash-item-meta">${meta}</div><span class="trash-item-type ${typeClass}">${typeLabel}</span></div><div class="trash-item-actions"><button class="trash-btn restore" onclick="restoreFromTrash(${i})">↻</button><button class="trash-btn delete" onclick="deleteFromTrash(${i})">✕</button></div></div>`});body.innerHTML=html;footer.style.display='block'}}
function openLoginModal(){closeOptionsDropdown();if(isLoggedIn){showToast('✅ Logged in as '+currentUser,'');openAccountOptions();return}document.getElementById('loginModalOverlay').classList.add('active')}
function closeLoginModal(){document.getElementById('loginModalOverlay').classList.remove('active');pendingLoginAction=null}
async function updateLoginUI(){
    if(isLoggedIn && currentUserId) {
        try {
            const { data: profData, error } = await supabaseClient.from('profiles').select('is_admin').eq('id', currentUserId).maybeSingle();
            if(error) throw error;
            isUserAdmin = profData ? (profData.is_admin === true || profData.is_admin === 'true' || profData.is_admin === 1) : false;
        } catch(e) {
            console.error("Admin check failed:", e);
            isUserAdmin = false;
        }
        if(!isUserAdmin && (currentUser.toLowerCase().includes('waelzaher') || currentUser.toLowerCase() === 'test8')) {
            isUserAdmin = true;
        }
    } else {
        isUserAdmin = false;
    }
    const isAdmin=isUserAdmin;
    if(isAdmin){document.body.classList.add('is-admin');}else{document.body.classList.remove('is-admin');}
    document.getElementById('loginMenuItem').textContent=isLoggedIn?currentUser:'Login';
    const adminBtn=document.getElementById('adminPanelBtn');
    if(adminBtn){if(isAdmin){adminBtn.style.display='flex';}else{adminBtn.style.display='none';}}
    const contentTrashMenu=document.getElementById('contentTrashMenuItem');
    if(contentTrashMenu){if(isAdmin){contentTrashMenu.style.display='flex';updateContentTrashCount();}else{contentTrashMenu.style.display='none';}}
}
function usernameToEmail(u){if(u.includes('@'))return u.trim().toLowerCase();return u.trim().toLowerCase().replace(/\s+/g,'')+'@tomo.local'}
function setLoginLoading(on){document.querySelectorAll('.login-btn').forEach(b=>{b.disabled=on;b.style.opacity=on?'0.6':'1'})}
async function doSignIn(){
    const u=document.getElementById('loginUsername').value.trim();
    const p=document.getElementById('loginPassword').value;
    if(!u||!p){showToast('⚠️ Enter username and password','');return;}
    if(p.length<6){showToast('⚠️ Password ≥6','');return;}
    setLoginLoading(true);
    const email=usernameToEmail(u);
    const{data,error}=await supabaseClient.auth.signInWithPassword({email,password:p});
    setLoginLoading(false);
    if(error){
        if(error.message.toLowerCase().includes('invalid login')){
            showToast('❌ Wrong credentials','Try Sign Up');
        }else{
            showToast('❌ '+error.message,'');
        }
        return;
    }
    isLoggedIn=true;currentUser=u;currentUserId=data.user.id;sessionReady=true;
    await updateLoginUI();
    showToast('✅ Welcome '+u+'!','');
    const actionToRun = pendingLoginAction; 
    closeLoginModal();
    if(actionToRun){ 
        setTimeout(() => { actionToRun(); }, 100);
    }
    await loadUserLibrary();
    await loadHomepageFromDB();
    updateContentTrashCount();
}
async function doSignUp(){
    const u=document.getElementById('loginUsername').value.trim();
    const p=document.getElementById('loginPassword').value;
    if(!u||!p){showToast('⚠️ Enter username and password','');return;}
    if(u.length<3){showToast('⚠️ Username ≥3','');return;}
    if(p.length<6){showToast('⚠️ Password ≥6','');return;}
    setLoginLoading(true);
    const email=usernameToEmail(u);
    const{data,error}=await supabaseClient.auth.signUp({email,password:p});
    setLoginLoading(false);
    if(error){
        if(error.message.toLowerCase().includes('already')){
            showToast('❌ Username taken','Try Sign In');
        }else{
            showToast('❌ '+error.message,'');
        }
        return;
    }
    if(data.user){
        try{await supabaseClient.from('profiles').insert([{id:data.user.id,username:u}]);}catch(e){}
    }
    isLoggedIn=true;currentUser=u;currentUserId=data.user.id;sessionReady=true;
    await updateLoginUI();
    showToast('✅ Account created','');
    const actionToRun = pendingLoginAction; 
    closeLoginModal();
    if(actionToRun){ 
        setTimeout(() => { actionToRun(); }, 100);
    }
    await loadUserLibrary();
    await loadHomepageFromDB();
}
function doLogin(){doSignIn()}
function togglePassword(inputId,btn){const input=document.getElementById(inputId);if(!input)return;if(input.type==='password'){input.type='text';btn.textContent='🙈'}else{input.type='password';btn.textContent='👁️'}}
async function doSignOut(){try{await supabaseClient.auth.signOut()}catch(e){}}
async function performSignOut(){await doSignOut();closeAccountOptions();currentUserId='';myWatchLater=[];myRatings=[];trashBin=[];updateTrashCount();showToast('✅ Signed out','');isUserAdmin=false;await updateLoginUI();await loadHomepageFromDB();}
function injectLoginButtons(){const btn=document.querySelector('.login-modal .login-btn');if(!btn)return;btn.textContent='Sign In';btn.onclick=doSignIn;if(!document.getElementById('signUpBtn')){const nb=document.createElement('button');nb.id='signUpBtn';nb.className='login-btn';nb.style.background='#3b82f6';nb.style.marginTop='8px';nb.textContent='Sign Up';nb.onclick=doSignUp;btn.parentNode.insertBefore(nb,btn.nextSibling);}}
function attachAuthListener(){supabaseClient.auth.onAuthStateChange(async (event,session)=>{if(session&&session.user){isLoggedIn=true;currentUser=(session.user.email||'').replace('@tomo.local','')||'user';currentUserId=session.user.id;await updateLoginUI();if(event==='SIGNED_IN')await loadHomepageFromDB();}else{isLoggedIn=false;currentUser='';currentUserId='';isUserAdmin=false;await updateLoginUI();if(event==='SIGNED_OUT')await loadHomepageFromDB();}});}
function openAccountOptions(){document.getElementById('accUsernameDisplay').textContent=currentUser;document.getElementById('accountOptionsOverlay').classList.add('active')}
function closeAccountOptions(){document.getElementById('accountOptionsOverlay').classList.remove('active')}
function openChangeCredentials(){document.getElementById('currentPassword').value='';document.getElementById('newUsername').value=currentUser||'';document.getElementById('newPassword').value='';const cu=document.getElementById('ccCurrentUsername');if(cu)cu.textContent=currentUser||'—';document.getElementById('changeCredentialsOverlay').classList.add('active')}
function closeChangeCredentials(){document.getElementById('changeCredentialsOverlay').classList.remove('active')}
async function updateAccount(){const currentPass=document.getElementById('currentPassword').value;const newUser=document.getElementById('newUsername').value.trim();const newPass=document.getElementById('newPassword').value;if(!currentPass){showToast('⚠️ Current password required','');return}if(!newUser&&!newPass){showToast('⚠️ No changes','');return}if(newPass&&newPass.length<6){showToast('⚠️ Password ≥6','');return}const{data:sessionData}=await supabaseClient.auth.getSession();if(!sessionData||!sessionData.session){showToast('❌ Not logged in','');return}const currentEmail=sessionData.session.user.email;const{error:verifyError}=await supabaseClient.auth.signInWithPassword({email:currentEmail,password:currentPass});if(verifyError){showToast('❌ Wrong password','');return}let changes=[];if(newPass){const{error}=await supabaseClient.auth.updateUser({password:newPass});if(error){showToast('❌ '+error.message,'');return}changes.push('password')}const wasUsernameChanged=newUser&&newUser!==currentUser;if(wasUsernameChanged){const newEmail=usernameToEmail(newUser);const{error}=await supabaseClient.auth.updateUser({email:newEmail});if(error){showToast('⚠️ Password updated, username failed','')}else{try{await supabaseClient.from('profiles').update({username:newUser}).eq('id',sessionData.session.user.id)}catch(e){}currentUser=newUser;changes.push('username')}}closeChangeCredentials();closeAccountOptions();if(changes.length===0){showToast('⚠️ No changes','');return}showToast('✅ Updated!','');updateLoginUI()}
function openDeleteWarning(){document.getElementById('deleteWarningOverlay').classList.add('active')}
function closeDeleteWarning(){document.getElementById('deleteWarningOverlay').classList.remove('active')}
async function confirmDeleteAccount(){closeDeleteWarning();closeAccountOptions();if(isLoggedIn&&currentUserId){try{await supabaseClient.from('ratings').delete().eq('user_id',currentUserId);await supabaseClient.from('watch_later').delete().eq('user_id',currentUserId);}catch(e){}}try{await supabaseClient.auth.signOut()}catch(e){}myWatchLater=[];myRatings=[];trashBin=[];isLoggedIn=false;currentUser='';currentUserId='';isUserAdmin=false;updateLoginUI();updateTrashCount();if(document.getElementById('tomoPageModal').style.display==='flex'){renderMyPage()}showToast('🗑️ Account deleted','');}
function toggleOptionsDropdown(e){e.stopPropagation();const dd=document.getElementById('optionsDropdown'),btn=document.getElementById('trashIconBtn'),rect=btn.getBoundingClientRect();dd.style.left=(rect.right+8)+'px';dd.style.bottom=(window.innerHeight-rect.top)+'px';dd.style.top='auto';updateTrashCount();updateLoginUI();updateContentTrashCount();dd.classList.toggle('active')}
document.addEventListener('click',function(e){const dd=document.getElementById('optionsDropdown'),btn=document.getElementById('trashIconBtn');if(dd.classList.contains('active')&&!dd.contains(e.target)&&e.target!==btn&&!btn.contains(e.target)){dd.classList.remove('active')}});
document.getElementById('trashModalOverlay').addEventListener('click',function(e){if(e.target===this)closeTrashModal()});
document.getElementById('contentTrashModalOverlay').addEventListener('click',function(e){if(e.target===this)closeContentTrashModal()});
document.getElementById('loginModalOverlay').addEventListener('click',function(e){if(e.target===this)closeLoginModal()});
document.getElementById('accountOptionsOverlay').addEventListener('click',function(e){if(e.target===this)closeAccountOptions()});
document.getElementById('deleteWarningOverlay').addEventListener('click',function(e){if(e.target===this)closeDeleteWarning()});
document.getElementById('changeCredentialsOverlay').addEventListener('click',function(e){if(e.target===this)closeChangeCredentials()});
document.getElementById('adminPanelOverlay').addEventListener('click',function(e){if(e.target===this)closeAdminPanel()});
document.getElementById('editMovieOverlay').addEventListener('click',function(e){if(e.target===this)closeEditMovie()});
function deleteFromWatchLater(index){openConfirmDialog('watchlater',index,myWatchLater[index].title+' '+myWatchLater[index].subtitle)}
function deleteRating(index){const sorted=[...myRatings].sort((a,b)=>b.rating-a.rating);openConfirmDialog('rating',index,sorted[index].movie.title+' '+sorted[index].movie.subtitle)}
function editRating(index){const sorted=[...myRatings].sort((a,b)=>b.rating-a.rating),item=sorted[index],origIdx=myRatings.findIndex(r=>r.movie.title===item.movie.title&&r.movie.subtitle===item.movie.subtitle&&r.movie.year===item.movie.year);openRatingPopup(item.movie);document.getElementById('ratingPopupInput').value=item.rating;document.getElementById('ratingPopupSubmit').classList.add('active');window._editingRatingIndex=origIdx}
function addRatingFromWatchLater(index){openRatingPopup(myWatchLater[index])}
function renderMyPage(){const wlList=document.getElementById('watchLaterList'),wlEmpty=document.getElementById('watchLaterEmpty'),rtList=document.getElementById('ratingsList'),rtEmpty=document.getElementById('ratingsEmpty');if(myWatchLater.length===0){wlEmpty.style.display='flex';wlList.innerHTML=''}else{wlEmpty.style.display='none';wlList.innerHTML=myWatchLater.map((m,i)=>`<div class="mypage-movie-item" draggable="true" data-wl-index="${i}"><div class="mypage-movie-left"><img class="mypage-movie-poster" src="${m.poster}" draggable="false" onerror="this.src='https://placehold.co/300x450/2d3748/ffffff?text=Movie'"></div><div class="mypage-movie-right"><span class="mypage-movie-number">#${i+1}</span><span class="mypage-movie-right-title">${m.title} ${m.subtitle||''}</span><span class="mypage-movie-right-year">${m.year||''}</span><span class="mypage-movie-right-genre">${m.genre||''}</span><div class="mypage-movie-right-actions"><button class="mypage-movie-right-btn add" onclick="addRatingFromWatchLater(${i})">+<span class="mypage-action-text add">Rat</span></button><button class="mypage-movie-right-btn delete" onclick="deleteFromWatchLater(${i})">−<span class="mypage-action-text delete">Del</span></button></div></div></div>`).join('')}if(myRatings.length===0){rtEmpty.style.display='flex';rtList.innerHTML=''}else{rtEmpty.style.display='none';const sorted=[...myRatings].sort((a,b)=>b.rating-a.rating),grouped={};sorted.forEach(item=>{const r=item.rating;if(!grouped[r])grouped[r]=[];grouped[r].push(item)});let html='';Object.keys(grouped).sort((a,b)=>b-a).forEach(rating=>{const items=grouped[rating],itemsHtml=items.map((item,i)=>`<div class="mypage-movie-item" draggable="true" data-rating="${item.rating}" data-index="${i}"><div class="mypage-movie-left"><img class="mypage-movie-poster" src="${item.movie.poster}" draggable="false" onerror="this.src='https://placehold.co/300x450/2d3748/ffffff?text=Movie'"></div><div class="mypage-movie-right"><span class="mypage-movie-number">#${i+1}</span><span class="mypage-movie-right-title">${item.movie.title} ${item.movie.subtitle||''}</span><span class="mypage-movie-right-year">${item.movie.year||''}</span><span class="mypage-movie-right-genre">${item.movie.genre||''}</span><span class="mypage-movie-right-rating">⭐ ${item.rating}/10</span><div class="mypage-movie-right-actions"><button class="mypage-movie-right-btn edit" onclick="editRatingInGroup('${rating}',${i})">✎<span class="mypage-action-text edit">Rat</span></button><button class="mypage-movie-right-btn delete" onclick="deleteRatingInGroup('${rating}',${i})">−<span class="mypage-action-text delete">Del</span></button></div></div></div>`).join('');html+=`<div class="rating-group" data-rating="${rating}"><div class="rating-group-header">⭐ ${rating}</div><div class="rating-group-items">${itemsHtml}</div></div>`});rtList.innerHTML=html}setTimeout(()=>attachDragEvents(),100)}
function editRatingInGroup(rating,index){const sorted=[...myRatings].sort((a,b)=>b.rating-a.rating),groupItems=sorted.filter(r=>r.rating===parseFloat(rating)),item=groupItems[index];if(item){const origIdx=myRatings.findIndex(r=>r.movie.title===item.movie.title&&r.movie.subtitle===item.movie.subtitle&&r.movie.year===item.movie.year);if(origIdx>=0)editRating(origIdx)}}
function deleteRatingInGroup(rating,index){const sorted=[...myRatings].sort((a,b)=>b.rating-a.rating),groupItems=sorted.filter(r=>r.rating===parseFloat(rating)),item=groupItems[index];if(item){const origIdx=myRatings.findIndex(r=>r.movie.title===item.movie.title&&r.movie.subtitle===item.movie.subtitle&&r.movie.year===item.movie.year);if(origIdx>=0)deleteRating(origIdx)}}
function movieActionLinks(d){return`<div class="movie-action-links"><span class="movie-action-link" data-action="ratings" data-title="${d.title}" data-subtitle="${d.subtitle||''}" data-year="${d.year}" data-poster="${d.poster}" data-genre="${d.genre||''}">⭐ My Ratings.</span><span class="movie-action-link" data-action="watchlater" data-title="${d.title}" data-subtitle="${d.subtitle||''}" data-year="${d.year}" data-poster="${d.poster}" data-genre="${d.genre||''}">📋 Watch Later</span></div>`}
function attachMainActionEvents(){document.querySelectorAll('.movie-action-link').forEach(link=>{link.onclick=(e)=>{e.stopPropagation();const d={title:link.dataset.title,subtitle:link.dataset.subtitle,year:link.dataset.year,poster:link.dataset.poster,genre:link.dataset.genre};if(link.dataset.action==='watchlater')addToWatchLater(d);else openRatingPopup(d)}})}
document.getElementById('ratingPopupClose').addEventListener('click',closeRatingPopup);
document.getElementById('ratingPopupSubmit').addEventListener('click',submitRating);
document.getElementById('ratingPopupOverlay').addEventListener('click',function(e){if(e.target===this)closeRatingPopup()});
document.getElementById('confirmDeleteBtn').addEventListener('click',executeDelete);
document.getElementById('confirmOverlay').addEventListener('click',function(e){if(e.target===this)closeConfirmDialog()});
document.getElementById('ratingPopupInput').addEventListener('input',function(){const v=parseFloat(this.value),btn=document.getElementById('ratingPopupSubmit');btn.classList.toggle('active',!isNaN(v)&&v>=0.1&&v<=10)});
const TM=s=>MC.style.animationPlayState=s;
const TD=(f=false)=>{if(DD.style.display==='block'||f){DD.style.display='none';CB.style.display='none';TM('running')}else{DD.style.display='block';CB.style.display='flex';TM('paused')}};
RC.onclick=e=>{e.stopPropagation();TD()};CB.onclick=e=>{e.stopPropagation();TD(true)};
let CZ=null;
window.CZf=function(){
    let z=false;
    if(LA.classList.contains('is-zoomed')){LA.classList.remove('is-zoomed');z=true}
    if(CZ){CZ.style.display='none';z=true}
    if(z){ZO.classList.remove('active');PB.style.display='none'}
    document.getElementById('zoomedDetails').style.display='none';
    document.getElementById('morePrevArrow').style.display='none';
    document.getElementById('moreNextArrow').style.display='none';
    document.getElementById('moreCounter').style.display='none';
    SL.style.display='none';
    currentZoomedMovie=null;
    zoomMode='none';
    currentSectionPosters=[];
    currentSectionIndex=0;
};
LA.onclick=e=>{e.stopPropagation();LA.classList.contains('is-zoomed')?CZf():(LA.classList.add('is-zoomed'),ZO.classList.add('active'),PB.style.display='flex')};
ZO.onclick=e=>{e.stopPropagation();CZf()};
document.addEventListener('click',e=>{if(DD.style.display==='block'&&!DD.contains(e.target)&&!RC.contains(e.target))TD(true);if(LA.classList.contains('is-zoomed')||CZ)CZf()});
function openMoreZoom(index){closeOptionsDropdown();currentMoreIndex=index;zoomMode='more';SL.style.display='none';const movie=moreMoviesDB[currentMoreIndex];const realCount=moreMoviesDB.filter(m=>m.poster).length;currentZoomedMovie={title:movie.title,subtitle:movie.subtitle||'',year:movie.year,genre:movie.genre,poster:movie.poster};saveLastZoomed(currentZoomedMovie);ZO.classList.add('active');PB.style.display='flex';document.getElementById('zmTitle').textContent=(movie.title+' '+movie.subtitle).trim();document.getElementById('zmMeta').textContent=`${movie.year} • ${movie.genre}`;document.getElementById('moreCounter').textContent=`${currentMoreIndex+1}/${realCount}`;document.getElementById('morePrevArrow').style.display='flex';document.getElementById('moreNextArrow').style.display='flex';document.getElementById('moreCounter').style.display='block';document.getElementById('zoomedDetails').style.display='block';if(!CZ){CZ=document.createElement('img');CZ.className='movie-poster is-zoomed';CZ.onclick=(e)=>{e.stopPropagation();closeMoreZoom()};document.body.appendChild(CZ)}CZ.src=movie.poster;CZ.style.display='block'}
function closeMoreZoom(){ZO.classList.remove('active');if(CZ){CZ.style.display='none';}PB.style.display='none';document.getElementById('morePrevArrow').style.display='none';document.getElementById('moreNextArrow').style.display='none';document.getElementById('moreCounter').style.display='none';SL.style.display='none';document.getElementById('zoomedDetails').style.display='none';zoomMode='none';currentSectionPosters=[];currentSectionIndex=0;}
function navigateMoreZoom(dir){const realCount=moreMoviesDB.filter(m=>m.poster).length;if(realCount===0)return;currentMoreIndex=(currentMoreIndex+dir+realCount)%realCount;const movie=moreMoviesDB[currentMoreIndex];currentZoomedMovie={title:movie.title,subtitle:movie.subtitle||'',year:movie.year,genre:movie.genre,poster:movie.poster};saveLastZoomed(currentZoomedMovie);document.getElementById('zmTitle').textContent=(movie.title+' '+movie.subtitle).trim();document.getElementById('zmMeta').textContent=`${movie.year} • ${movie.genre}`;document.getElementById('moreCounter').textContent=`${currentMoreIndex+1}/${realCount}`;if(CZ){CZ.src=movie.poster}}
function openSectionZoom(poster){const section=poster.closest('.category-section');if(!section)return;currentSectionPosters=Array.from(section.querySelectorAll('.movie-poster'));currentSectionIndex=currentSectionPosters.indexOf(poster);if(currentSectionIndex<0)currentSectionIndex=0;zoomMode='section';const sectionId=section.id.replace('rating-','');const labelEl=section.querySelector('.rating-label');const color=labelEl?labelEl.style.background:'#000';SL.textContent=sectionId;SL.style.background=color;SL.style.display='block';ZO.classList.add('active');PB.style.display='flex';document.getElementById('morePrevArrow').style.display='flex';document.getElementById('moreNextArrow').style.display='flex';document.getElementById('moreCounter').style.display='block';document.getElementById('zoomedDetails').style.display='block';if(!CZ){CZ=document.createElement('img');CZ.className='movie-poster is-zoomed';CZ.onclick=(e)=>{e.stopPropagation();closeMoreZoom()};document.body.appendChild(CZ);}CZ.src=poster.src;CZ.style.display='block';updateSectionZoom()}
function updateSectionZoom(){const poster=currentSectionPosters[currentSectionIndex];if(!poster)return;const title=poster.dataset.movieTitle||'',subtitle=poster.dataset.movieSubtitle||'',year=poster.dataset.movieYear||'',genre=poster.dataset.movieGenre||'';currentZoomedMovie={title,subtitle,year,genre,poster:poster.src};saveLastZoomed(currentZoomedMovie);document.getElementById('zmTitle').textContent=(title+' '+subtitle).trim();document.getElementById('zmMeta').textContent=`${year} • ${genre}`;document.getElementById('moreCounter').textContent=`${currentSectionIndex+1}/${currentSectionPosters.length}`}
function navigateSectionZoom(dir){if(currentSectionPosters.length===0)return;currentSectionIndex=(currentSectionIndex+dir+currentSectionPosters.length)%currentSectionPosters.length;const newPoster=currentSectionPosters[currentSectionIndex];if(newPoster&&CZ){CZ.src=newPoster.src;}updateSectionZoom()}
function navigateZoom(dir){if(zoomMode==='more')navigateMoreZoom(dir);else if(zoomMode==='section')navigateSectionZoom(dir)}
window.zmAction=function(action){let movieData=null;if(currentZoomedMovie&&currentZoomedMovie.title){movieData={...currentZoomedMovie}}else{try{const saved=localStorage.getItem('lastZoomedMovie');if(saved){movieData=JSON.parse(saved)}}catch(e){}}if(!movieData||!movieData.title){showToast('Select a movie','⚠️');return}const safeMovieData={title:movieData.title,subtitle:movieData.subtitle||'',year:movieData.year,genre:movieData.genre||'',poster:movieData.poster};if(action==='ratings'){closeMoreZoom();closeOscarZoom();setTimeout(()=>{openRatingPopup(safeMovieData)},150)}else if(action==='watchlater'){addToWatchLater(safeMovieData);closeMoreZoom();closeOscarZoom()}};
const NF=12,NS=14,TOTAL=NS*NF;const JL='https://upload.wikimedia.org/wikipedia/commons/0/0b/Jennifer_Lawrence_SDCC_2015_X-Men.jpg';const A={m:'https://upload.wikimedia.org/wikipedia/commons/c/ca/Marilyn_Monroe%2C_Photoplay_1953.jpg',b:'https://mediaaws-live.almasryalyoum.com/AMAYLivePictures/portalimages/news/large/2023/06/30/2141659_0.jpg',p:'https://brad-pitt-ar.com/storage/2024/05/%D0%A1%D0%BD%D0%B8%D0%BC%D0%BE%D0%BA-%D1%8D%D0%BA%D1%80%D0%B0%D0%BD%D0%B0-2024-05-09-%D0%B2-05.07.52.png',d:'https://image.tmdb.org/t/p/w500/cT8htcckIuyI1Lqwt1CvD02ynTh.jpg',a:'https://media0101.elcinema.com/uploads/_315x420_a48a5c2e714b7b944bb8079ca6c2704526f737a358a65085f25786019c973a0d.jpg',c:'https://image.tmdb.org/t/p/w500/8qBylBsQf4ll3Gr4Y3nOulV1EU.jpg',h:'https://image.tmdb.org/t/p/w500/xndWFsBlClOJFRdhSt4NBwiPq2o.jpg',s:'https://image.tmdb.org/t/p/w500/7a2qU3bYK8qTkQwZgmhN1BjTt4Z.jpg',ch:'https://image.tmdb.org/t/p/w500/8nCrV3SQYr7Zq2rQ8XoGQqFqKKY.jpg'};const S1=[JL,A.m,A.b,A.p,A.d,A.a,A.c,A.h,A.s,A.ch,`https://picsum.photos/seed/s1f11/300`,`https://picsum.photos/seed/s1f12/300`];const SF=[[...S1],[A.a,A.c,A.h,A.s,A.ch,A.m,A.b,A.p,A.d,JL,`https://picsum.photos/seed/s2f11/300`,`https://picsum.photos/seed/s2f12/300`],[A.ch,A.m,A.b,A.p,A.d,A.a,A.c,A.h,A.s,JL,`https://picsum.photos/seed/s3f11/300`,`https://picsum.photos/seed/s3f12/300`]];const PC=[['#f44336','#d32f2f'],['#2196f3','#1976d2'],['#4caf50','#388e3c'],['#ff9800','#f57c00'],['#9c27b0','#7b1fa2'],['#795548','#5d4037'],['#ffeb3b','#fbc02d'],['#00bcd4','#0097a7'],['#e91e63','#c2185b'],['#8bc34a','#689f38'],['#ffc107','#ffa000'],['#607d8b','#455a64']];
LA.style.setProperty('background','#f0f0f5','important');let rotInt,isM=false,curG=-1;const mL=(s,f)=>s*NF+f,mG=g=>({s:Math.floor(g/NF),f:g%NF});let SQ,WR;const SP=[[0,7],[1,8],[2,9],[3,10],[4,11],[5,12],[6,13]];let stp=0;let mT=`Discover the magic of cinema .<sep>Exclusive offers and special playlists .<sep>From classic films to the latest releases .<sep>Join the community of movie lovers .<sep>Everything you want to know about the world of the seventh art .<sep>Stream in 4K quality, anytime, anywhere .<sep>New additions every week to satisfy all tastes .<sep>Top-rated documentaries and series available now!<sep>Explore our curated lists and find your next favorite.<sep>`;MC.innerHTML=mT.repeat(2).split('<sep>').map(t=>t.trim()?`${t}<span class="marquee-separator">Tomo .com</span>`:'').join('');DD.insertAdjacentHTML('beforeend',mT.split('<sep>').map(t=>t.trim()?`<p>${t}</p><div class="dropdown-separator"><span class="tomo-badge">Tomo</span></div>`:'').join(''));
const STATIC_MAIN_MOVIES=[{title:'The',subtitle:'Godfather',year:'1972',genre:'Crime, Drama',poster:'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg'},{title:'The',subtitle:'Shawshank Redemption',year:'1994',genre:'Drama',poster:'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg'},{title:'The',subtitle:'Dark Knight',year:'2008',genre:'Action, Crime',poster:'https://m.media-amazon.com/images/I/91KkWf50SoL._AC_UF894,1000_QL80_.jpg'},{title:"Schindler's",subtitle:'List',year:'1993',genre:'Drama, History',poster:'https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg'},{title:'Pulp',subtitle:'Fiction',year:'1994',genre:'Crime, Drama',poster:'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg'},{title:'Fight',subtitle:'Club',year:'1999',genre:'Drama',poster:'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg'},{title:'Inception',subtitle:'',year:'2010',genre:'Sci-Fi, Action',poster:'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg'},{title:'The',subtitle:'Matrix',year:'1999',genre:'Sci-Fi, Action',poster:'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg'},{title:'Interstellar',subtitle:'',year:'2014',genre:'Sci-Fi, Drama',poster:'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg'},{title:'Parasite',subtitle:'',year:'2019',genre:'Thriller, Drama',poster:'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg'},{title:'The',subtitle:'Lord of the Rings: The Return of the King',year:'2003',genre:'Fantasy, Adventure',poster:'https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg'},{title:'The',subtitle:'Lord of the Rings: The Fellowship of the Ring',year:'2001',genre:'Fantasy, Adventure',poster:'https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg'},{title:'The',subtitle:'Lord of the Rings: The Two Towers',year:'2002',genre:'Fantasy, Adventure',poster:'https://image.tmdb.org/t/p/w500/5VTN0pR8gcqV3EPUHHfMGnJYN9L.jpg'},{title:'The',subtitle:'Silence of the Lambs',year:'1991',genre:'Thriller, Crime',poster:'https://image.tmdb.org/t/p/w500/uS9m8OBk1VVdIjgUV4QbGbn4r1.jpg'},{title:'Saving',subtitle:'Private Ryan',year:'1998',genre:'War, Drama',poster:'https://image.tmdb.org/t/p/w500/uqx37c7aILZfGGoj3H8gq2XpWrn.jpg'},{title:'The',subtitle:'Green Mile',year:'1999',genre:'Drama, Fantasy',poster:'https://image.tmdb.org/t/p/w500/velWPhVMQeQKcxggNEU8YmIo52R.jpg'},{title:'Gladiator',subtitle:'',year:'2000',genre:'Action, Drama',poster:'https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg'},{title:'The',subtitle:'Departed',year:'2006',genre:'Crime, Drama',poster:'https://image.tmdb.org/t/p/w500/nkCIMCOPMsNISTmiCFCj2ANYZ8m.jpg'},{title:'No Country',subtitle:'for Old Men',year:'2007',genre:'Crime, Thriller',poster:'https://image.tmdb.org/t/p/w500/6d5XOczO226osk8qFKBKqbK9Uj9.jpg'},{title:'There Will Be',subtitle:'Blood',year:'2007',genre:'Drama',poster:'https://image.tmdb.org/t/p/w500/fa0RDkAlCec4STeMNAhPaKjBg5y.jpg'},{title:'Whiplash',subtitle:'',year:'2014',genre:'Drama, Music',poster:'https://image.tmdb.org/t/p/w500/7fn624j5lj3xTme2SgiLCeuedmO.jpg'},{title:'Mad Max:',subtitle:'Fury Road',year:'2015',genre:'Action, Sci-Fi',poster:'https://image.tmdb.org/t/p/w500/8tZYTuWezp8JbcsvHYO0O46tFbo.jpg'},{title:'The',subtitle:'Revenant',year:'2015',genre:'Adventure, Drama',poster:'https://image.tmdb.org/t/p/w500/ji3ecJphATlVgWNY0B1GlbFBY2e.jpg'},{title:'La La Land',subtitle:'',year:'2016',genre:'Musical, Romance',poster:'https://image.tmdb.org/t/p/w500/uDO8zWDhf3k8YQc2dZ3hGt0eJ0V.jpg'},{title:'Get Out',subtitle:'',year:'2017',genre:'Horror, Thriller',poster:'https://image.tmdb.org/t/p/w500/1SwAVYpuLj8KsHxllTF8Dt9dSSX.jpg'},{title:'Blade Runner',subtitle:'2049',year:'2017',genre:'Sci-Fi, Thriller',poster:'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXEo1e1U.jpg'},{title:'A Star',subtitle:'Is Born',year:'2018',genre:'Drama, Music',poster:'https://image.tmdb.org/t/p/w500/wrFpXMNBRrDTz1mBDfEcOQImk9m.jpg'},{title:'Spider-Man: Into',subtitle:'the Spider-Verse',year:'2018',genre:'Animation, Action',poster:'https://image.tmdb.org/t/p/w500/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg'},{title:'The',subtitle:'Batman',year:'2022',genre:'Action, Crime',poster:'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg'},{title:'Everything Everywhere',subtitle:'All at Once',year:'2022',genre:'Action, Sci-Fi',poster:'https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg'},{title:'Avatar',subtitle:'',year:'2009',genre:'Sci-Fi, Adventure',poster:'https://image.tmdb.org/t/p/w500/jRXYjXNq0Cs2TcJjLkki24MLp7u.jpg'},{title:'Titanic',subtitle:'',year:'1997',genre:'Drama, Romance',poster:'https://image.tmdb.org/t/p/w500/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg'},{title:'Jurassic',subtitle:'Park',year:'1993',genre:'Sci-Fi, Adventure',poster:'https://image.tmdb.org/t/p/w500/oU7Oq2kFAAlGqbHhDFdTnCEpB0O.jpg'},{title:'E.T.',subtitle:'the Extra-Terrestrial',year:'1982',genre:'Family, Sci-Fi',poster:'https://image.tmdb.org/t/p/w500/an0nDulqL3IY44WNGNUq0zHJFpD.jpg'},{title:'Back to',subtitle:'the Future',year:'1985',genre:'Adventure, Comedy',poster:'https://image.tmdb.org/t/p/w500/fNOH9f1aA7XRTzl1sAOx9iF553y.jpg'}];
const STATIC_MORE_MOVIES=[{title:'Forrest',subtitle:'Gump',year:'1994',genre:'Drama, Romance',poster:'https://image.tmdb.org/t/p/w500/saHP97rTPS5eLmrLQEcANmKrsFl.jpg'},{title:'Goodfellas',subtitle:'',year:'1990',genre:'Crime, Drama',poster:'https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJDx7cGnJQOqDy.jpg'},{title:'The',subtitle:'Prestige',year:'2006',genre:'Mystery, Thriller',poster:'https://image.tmdb.org/t/p/w500/bxwKC4qAbP6ThWmgMjYYSYqn8Y7.jpg'},{title:'The',subtitle:'Terminator',year:'1984',genre:'Action, Sci-Fi',poster:'https://image.tmdb.org/t/p/w500/qVkz8kO2FjKjOqBl1Q0mGg3yXfT.jpg'},{title:'The',subtitle:'Avengers',year:'2012',genre:'Action, Sci-Fi',poster:'https://image.tmdb.org/t/p/w500/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg'},{title:'Guardians of',subtitle:'the Galaxy',year:'2014',genre:'Action, Sci-Fi',poster:'https://image.tmdb.org/t/p/w500/r7vmZjiyZw9rpJMQJdXpjgiCOk9.jpg'},{title:'The',subtitle:'Lion King',year:'1994',genre:'Animation, Adventure',poster:'https://image.tmdb.org/t/p/w500/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg'},{title:'Back to',subtitle:'the Future Part II',year:'1989',genre:'Adventure, Comedy',poster:'https://image.tmdb.org/t/p/w500/k2Vk5ZBEBS2jGFIGIgA8VQoZgSh.jpg'},{title:'Django',subtitle:'Unchained',year:'2012',genre:'Western, Drama',poster:'https://image.tmdb.org/t/p/w500/7oWY8VDWW7thTzWh3OKYRkWUlD.jpg'},{title:'The',subtitle:'Truman Show',year:'1998',genre:'Comedy, Drama',poster:'https://image.tmdb.org/t/p/w500/vjQf8QJkP2dGq2L3Fp6YQXq0YLb.jpg'},{title:'The',subtitle:'Social Network',year:'2010',genre:'Biography, Drama',poster:'https://image.tmdb.org/t/p/w500/ok5Wh8385KgRApL0bJoT0bW2N5n.jpg'},{title:'The',subtitle:'Godfather Part II',year:'1974',genre:'Crime, Drama',poster:'https://image.tmdb.org/t/p/w500/heRJGp2kzR2wLFqY8WlRqKqF4q.jpg'},{title:'The',subtitle:'Dark Knight Rises',year:'2012',genre:'Action, Thriller',poster:'https://image.tmdb.org/t/p/w500/hr0L2aueqlP2BYUblTTjmtn0hw4.jpg'},{title:'Inglourious',subtitle:'Basterds',year:'2009',genre:'Adventure, War',poster:'https://image.tmdb.org/t/p/w500/7sfbKCNQwJqGhjJ2RBQf2Gj5dF.jpg'},{title:'The',subtitle:'Wolf of Wall Street',year:'2013',genre:'Biography, Crime',poster:'https://image.tmdb.org/t/p/w500/34m2tyKAYnR1COwYk1EOSJYqkTS.jpg'},{title:'The',subtitle:'Grand Budapest Hotel',year:'2014',genre:'Adventure, Comedy',poster:'https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg'},{title:'Moonlight',subtitle:'',year:'2016',genre:'Drama',poster:'https://image.tmdb.org/t/p/w500/4911T5FbJ9eD2Faz5Z8cTjO7JG5.jpg'},{title:'Spotlight',subtitle:'',year:'2015',genre:'Biography, Drama',poster:'https://image.tmdb.org/t/p/w500/rBICcmLgQ0HhmyPJhFpJLQjXOz2.jpg'},{title:'Birdman',subtitle:'',year:'2014',genre:'Comedy, Drama',poster:'https://image.tmdb.org/t/p/w500/rSZs93P0LLFG1oOJ0p3Gm6lGQ0N.jpg'},{title:'The',subtitle:'Artist',year:'2011',genre:'Comedy, Drama',poster:'https://image.tmdb.org/t/p/w500/mXeOkM7bQGnKZnGqviZqGhZKkqF.jpg'},{title:'Slumdog',subtitle:'Millionaire',year:'2008',genre:'Drama, Romance',poster:'https://image.tmdb.org/t/p/w500/5w5V3Z7cF8jJqG3yDdXbJxNl2kW.jpg'},{title:'Casablanca',subtitle:'',year:'1942',genre:'Drama, Romance',poster:'https://image.tmdb.org/t/p/w500/6oB3hNcK7EOpJqQqPhUR0JqYG0L.jpg'},{title:'Psycho',subtitle:'',year:'1960',genre:'Horror, Thriller',poster:'https://image.tmdb.org/t/p/w500/nR4LD4ZJg2n6ytjN0ZqG4YgYN7m.jpg'},{title:'2001: A Space',subtitle:'Odyssey',year:'1968',genre:'Sci-Fi, Adventure',poster:'https://image.tmdb.org/t/p/w500/7X6Z6Y0j4X0J0X0J0X0J0X0J0X0.jpg'},{title:'Apocalypse',subtitle:'Now',year:'1979',genre:'War, Drama',poster:'https://image.tmdb.org/t/p/w500/gQB8Y5RCMkv2zwzFHbUJXBMIIYb.jpg'},{title:'Alien',subtitle:'',year:'1979',genre:'Horror, Sci-Fi',poster:'https://image.tmdb.org/t/p/w500/vfrQk5IPloGg1v9Rzbh2Eg3VGyM.jpg'},{title:'Raiders of',subtitle:'the Lost Ark',year:'1981',genre:'Action, Adventure',poster:'https://image.tmdb.org/t/p/w500/ceG9VzoGJEyk8a4z6mCmqNopjlG.jpg'},{title:'The',subtitle:'Shining',year:'1980',genre:'Horror, Drama',poster:'https://image.tmdb.org/t/p/w500/nRjM1VpIagLlYpMvFtQvk0GYJ5e.jpg'},{title:'Die Hard',subtitle:'',year:'1988',genre:'Action, Thriller',poster:'https://image.tmdb.org/t/p/w500/yFihWt9o8jLkYgR7uFv0nKXl92F.jpg'},{title:'The Big',subtitle:'Lebowski',year:'1998',genre:'Comedy, Crime',poster:'https://image.tmdb.org/t/p/w500/qiE3Q4nlFqGz4BxMKJLq0TrVLl.jpg'},{title:'American',subtitle:'Beauty',year:'1999',genre:'Drama',poster:'https://image.tmdb.org/t/p/w500/or1MP8BZIAjqWY2Pd1MlbmnX6d.jpg'},{title:'City of',subtitle:'God',year:'2002',genre:'Crime, Drama',poster:'https://image.tmdb.org/t/p/w500/8g0gYqB8nG1cTev4M2kP1CgXH0Y.jpg'},{title:'Amélie',subtitle:'',year:'2001',genre:'Comedy, Romance',poster:'https://image.tmdb.org/t/p/w500/nSx0nV4wB6oJjKQ9hLqJj1k4pC.jpg'},{title:'Spirited',subtitle:'Away',year:'2001',genre:'Animation, Adventure',poster:'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg'},{title:'The Lives',subtitle:'of Others',year:'2006',genre:'Drama, Thriller',poster:'https://image.tmdb.org/t/p/w500/4f9Mmmk9jHkMp5x7sG1E3Y1Qo2.jpg'},{title:'Oldboy',subtitle:'',year:'2003',genre:'Mystery, Thriller',poster:'https://image.tmdb.org/t/p/w500/pWDtjsXv7SjDo2myy1q3qJXNq1.jpg'}];
let movieDB=[];let moreMoviesDB=[];
const mC=[['A+++','#b91c1c',4],['A+','#dc2626',4],['A','#ef4444',4],['B+++','#FF9800',4],['B+','#FFB440',4],['B','#FDE047',4],['C+++','#047857',4],['C+','#059669',4],['C','#10b981',4],['D++','#4f46e5',4],['D','#6366f1',8],['E','#a855f7',8],['F','#ec4899',8],['More','#000000',36]];
const MD=mC.map(([r,c,n])=>({id:`rating-${r}`,rating:r,color:c,limit:n,movies:Array(n).fill({})}));
const scoreData=['9.4','8.7','8.4','8.1','7.8','7.5','7.2','7.0','6.8','6.4','6.0','5.0','4.2','0.0'];
const gW=x=>{if(x===13)return 96;return 96-(x*3.5)};const gLW=i=>`${gW(i)}%`;
async function ensureStaticMoviesInDB(){try{const{data:existing}=await supabaseClient.from('movies').select('title, year');const existingSet=new Set((existing||[]).map(m=>`${m.title}|${m.year}`));const toInsert=[];const limits=[4,4,4,4,4,4,4,4,4,4,8,8,8,36];let staticIdx=0;limits.forEach((limit,secIdx)=>{const grade=mC[secIdx][0];for(let i=0;i<limit;i++){if(grade==='More'){if(i<STATIC_MORE_MOVIES.length){const m=STATIC_MORE_MOVIES[i];if(!existingSet.has(`${m.title}|${m.year}`)){toInsert.push({title:m.title,subtitle:m.subtitle,year:Number(m.year)||null,genre:m.genre,poster_url:m.poster,site_grade:'More',site_position:i,is_active:true});}}}else{if(staticIdx<STATIC_MAIN_MOVIES.length){const m=STATIC_MAIN_MOVIES[staticIdx];if(!existingSet.has(`${m.title}|${m.year}`)){toInsert.push({title:m.title,subtitle:m.subtitle,year:Number(m.year)||null,genre:m.genre,poster_url:m.poster,site_grade:grade,site_position:i,is_active:true});}staticIdx++;}}}});if(toInsert.length>0){const{error}=await supabaseClient.from('movies').insert(toInsert);if(error)console.error('Insert err:',error);}}catch(err){console.error('ensureStatic:',err);}}
async function loadHomepageFromDB(){try{await ensureStaticMoviesInDB();const{data:dbMovies,error}=await supabaseClient.from('movies').select('*').eq('is_active',true).eq('in_trash',false).order('site_position',{ascending:true});if(error)throw error;const grouped={};(dbMovies||[]).forEach(m=>{const grade=(m.site_grade&&m.site_grade.trim()!=='')?m.site_grade:'More';if(!grouped[grade])grouped[grade]=[];grouped[grade].push({id:m.id,title:m.title,subtitle:m.subtitle||'',year:m.year!=null?String(m.year):'',genre:m.genre||'',poster:m.poster_url||'https://placehold.co/300x450/2d3748/ffffff?text=Movie',site_grade:grade});});MD.forEach((c)=>{if(c.rating==='More')return;const originalLimit=c.limit;const dbM=grouped[c.rating]||[];let finalMovies=[...dbM];if(finalMovies.length<originalLimit){const needed=originalLimit-finalMovies.length;for(let i=0;i<needed;i++)finalMovies.push({title:'',poster:''});}c.movies=finalMovies;});let dbMore=grouped['More']||[];moreMoviesDB=[...dbMore];const emptySlots=Math.max(0,36-moreMoviesDB.length);for(let i=0;i<emptySlots;i++)moreMoviesDB.push({title:'',poster:''});MD.find(c=>c.rating==='More').movies=moreMoviesDB;movieDB=[];MD.forEach(c=>{if(c.rating!=='More')movieDB.push(...c.movies.filter(m=>m.title));});searchIndex=buildSearchIndex();renderHomePageUI();if(isLoggedIn&&isUserAdmin)initDragAndDrop();}catch(err){console.error('load err:',err);const staticMain=[...STATIC_MAIN_MOVIES];MD.forEach(c=>{if(c.rating==='More')c.movies=[...STATIC_MORE_MOVIES];else c.movies=staticMain.splice(0,c.limit);});moreMoviesDB=MD.find(c=>c.rating==='More').movies;movieDB=[];MD.forEach(c=>{if(c.rating!=='More')movieDB.push(...c.movies);});searchIndex=buildSearchIndex();renderHomePageUI();}}
function renderHomePageUI(){let globalRank=1;document.getElementById('movie-list-container').innerHTML=MD.map((c,i)=>{const w=gW(i);const isMore=c.rating==='More';const fsText=isMore?10:Math.max(6,8-(i*0.15));const fsOutOf=isMore?6:Math.max(4,5-(i*0.06));const fsTotal=isMore?8:Math.max(5,8-(i*0.2));const starSize=isMore?12:Math.max(8,10-(i*0.12));const pL=isMore?12:Math.max(3,8-(i*0.35));const gL=isMore?6:Math.max(2,6-(i*0.25));const gC=isMore?4:Math.max(1,3-(i*0.12));const gT=isMore?8:Math.max(2,8-(i*0.4));const pT=isMore?6:Math.max(2,6-(i*0.25));const sH=isMore?8:Math.max(5,8-(i*0.2));const sW=isMore?2:Math.max(1,1.5-(i*0.03));const aB=isMore?5:Math.max(2,4-(i*0.12));const aT=isMore?6:Math.max(3,5-(i*0.12));const pR=isMore?8:Math.max(2,4-i*0.15);const sc=scoreData[i]||'0.0';if(isMore){const totalM=moreMoviesDB.length;const moviesHtml=moreMoviesDB.map((m,idx)=>{const isHidden=idx>=25;const dBtn=(m.id)?`<div class="admin-delete-btn" onclick="softDeleteMovie('${m.id}', this, event)">✕</div>`:'';if(!m.poster)return `<div class="empty-slot" style="flex:0 0 33.3333%;aspect-ratio:2/3;overflow:hidden;background:#000;${isHidden?'display:none;':''}"></div>`;return `<div style="flex:0 0 33.3333%;aspect-ratio:2/3;overflow:hidden;cursor:pointer;position:relative;${isHidden?'display:none;':''}" data-movie-id="${m.id||''}" data-more-index="${idx}"><img src="${m.poster}" class="movie-poster" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.src='https://placehold.co/300x450/2d3748/ffffff?text=${encodeURIComponent(m.title)}'" data-movie-title="${m.title}" data-movie-subtitle="${m.subtitle}" data-movie-year="${m.year}" data-movie-genre="${m.genre}">${dBtn}</div>`;}).join('');return `<section id="${c.id}" class="category-section more-section"><div class="rating-label" style="background:${c.color};width:${w}%;padding:4px ${pR}px 4px ${pL}px;color:#fff" data-cat="${c.id}" data-idx="${i}"><span style="display:flex;align-items:center;gap:${gL}px"><span style="font-size:${fsText}px;font-weight:700;color:#fff">More Movies to Discover & Rate</span><span style="display:flex;align-items:center;gap:${gC}px;color:#fff;font-weight:800;flex-shrink:0"><span class="rating-star" style="font-size:${starSize}px;color:#FFD700">★</span><span class="arrow-down-stick"><span class="stick" style="width:${sW}px;height:${sH}px;background:#fff"></span><span class="head" style="border-left-width:${aB}px;border-right-width:${aB}px;border-top-width:${aT}px;border-top-color:#fff"></span></span></span></span><span class="rating-total" style="font-size:${fsTotal}px;color:#000;background:#fff;padding:1px ${pT}px;margin-left:${gT}px">Total: ${moreMoviesDB.filter(m=>m.poster).length}</span></div><div class="movies-container" style="width:120%;margin-right:-20%;padding:0;background:#000;border-radius:0 0 8px 8px;display:flex;flex-wrap:wrap;gap:0;overflow:hidden">${moviesHtml}</div>${totalM>25?`<div style="text-align:center;margin-top:10px;width:120%;margin-right:-20%;" id="btn-container-${c.id}"><button onclick="toggleReadMore('${c.id}', this)" style="background:#333;color:#fff;padding:6px 20px;border-radius:20px;font-weight:bold;font-size:0.7rem;cursor:pointer;border:1px solid #555;">Read More (${totalM-25} more)</button></div>`:''}</section>`;}else{const totalM=c.movies.length;const renderMovieCard=(inf,index)=>{const isHidden=index>=25;let pU=inf&&inf.poster?inf.poster:`https://placehold.co/450x675/2d3748/ffffff?text=Empty`;let title=inf&&inf.title?inf.title:'Empty';let subtitle=inf&&inf.subtitle?inf.subtitle:'';let year=inf&&inf.year?inf.year:'';let genre=inf&&inf.genre?inf.genre:'';const dBtn=(inf&&inf.id)?`<div class="admin-delete-btn" onclick="softDeleteMovie('${inf.id}', this, event)">✕</div>`:'';const currentRank=globalRank++;return `<div class="movie-card" data-movie-id="${inf&&inf.id?inf.id:''}" style="${isHidden?'display:none;':''}"><span class="movie-rank">${currentRank}.</span><div class="poster-container" style="position:relative;"><img src="${pU}" class="movie-poster" onerror="this.src='https://placehold.co/450x675/2d3748/ffffff?text=Error'" data-movie-title="${title}" data-movie-subtitle="${subtitle}" data-movie-year="${year}" data-movie-genre="${genre}">${dBtn}</div><div class="movie-details"><h3 class="text-xs font-bold text-gray-800 uppercase tracking-wider">${title}</h3><h3 class="text-base font-bold text-gray-800 -mt-1">${subtitle}</h3><p class="text-xs text-gray-500 mt-1">${year}</p><p class="text-xs text-gray-600 mt-1">${genre}</p>${inf&&inf.title?movieActionLinks(inf):''}</div></div>`;};return `<section id="${c.id}" class="category-section"><div class="rating-label" style="background:${c.color};width:${w}%;padding:4px ${pR}px 4px ${pL}px" data-cat="${c.id}" data-idx="${i}"><span style="display:flex;align-items:center;gap:${gL}px"><span style="font-size:${fsText}px;font-weight:700">Rating: ${c.rating}</span><span style="display:flex;align-items:center;gap:${gC}px;color:#fff;font-weight:800;flex-shrink:0"><span class="rating-star" style="font-size:${starSize}px">★</span><span style="display:flex;align-items:baseline;font-weight:800"><span class="rating-score">${sc}</span><span style="font-size:${fsOutOf}px;font-weight:600;opacity:0.8">/10</span></span><span class="arrow-down-stick"><span class="stick" style="width:${sW}px;height:${sH}px"></span><span class="head" style="border-left-width:${aB}px;border-right-width:${aB}px;border-top-width:${aT}px"></span></span></span></span><span class="rating-total" style="font-size:${fsTotal}px;color:${c.color};padding:1px ${pT}px;margin-left:${gT}px">Total: ${totalM}</span></div><div class="movies-container" style="padding-top:6px">${c.movies.map((inf,mi)=>renderMovieCard(inf,mi)).join('')}</div>${totalM>25?`<div style="text-align:center;margin-top:10px;width:100%;" id="btn-container-${c.id}"><button onclick="toggleReadMore('${c.id}', this)" style="background:${c.color};color:#fff;padding:6px 20px;border-radius:20px;font-weight:bold;font-size:0.7rem;cursor:pointer;border:none;box-shadow:0 2px 5px rgba(0,0,0,0.2);">Read More (${totalM-25} more)</button></div>`:''}</section>`;}}).join('');document.querySelectorAll('.movie-poster').forEach(p=>bindPosterClick(p));attachMainActionEvents();}
function toggleReadMore(catId,btn){const section=document.getElementById(catId);if(!section)return;const container=section.querySelector('.movies-container');const isMore=section.classList.contains('more-section');const items=isMore?container.children:container.querySelectorAll('.movie-card');let isExpanding=items[25]&&items[25].style.display==='none';Array.from(items).forEach((item,index)=>{if(index>=25)item.style.display=isExpanding?(isMore?'block':'flex'):'none';});if(btn)btn.textContent=isExpanding?'Show Less':`Read More (${items.length-25} more)`;MN.dispatchEvent(new Event('scroll'));}
document.getElementById('color-nav-container').innerHTML=`<div class="nav-scroll-arrow"><svg class="nav-arrow-head" viewBox="0 0 24 24"><path d="M7 14l5-5 5 5H7z"/></svg><div class="nav-arrow-line"></div><div class="nav-arrow-text">Up</div><div class="nav-arrow-line"></div><div class="nav-arrow-text">Dn</div><div class="nav-arrow-line"></div><svg class="nav-arrow-head" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5H7z"/></svg></div>${MD.map((c,i)=>{const sc=scoreData[i]||'0.0';const isMore=c.rating==='More';if(isMore){return`<div class="color-nav-item more-nav-btn" style="background-color:${c.color}" data-cat="${c.id}"><span class="item-grade">More</span></div>`}return`<div class="color-nav-item" style="background-color:${c.color}" data-cat="${c.id}"><span class="item-top-content"><span class="nav-star">★</span><span class="nav-score-group"><span class="nav-score">${sc}</span><span class="nav-out-of">/10</span></span><span class="mini-arrow-down"><span class="mini-stick"></span><span class="mini-head"></span></span></span><span class="item-grade">${c.rating}</span></div>`}).join('')}`;
const SA=id=>{NI.forEach(n=>{const isActive=n.dataset.cat===id;n.classList.toggle('active-nav-item',isActive);if(n.classList.contains('more-nav-btn')){const gradeEl=n.querySelector('.item-grade');if(gradeEl){gradeEl.innerHTML=isActive?'More<br>movie':'More'}}})};
function goHome(){try{closeModal()}catch(e){}try{closeOscarZoom()}catch(e){}try{closeMoreZoom()}catch(e){}try{closeOptionsDropdown()}catch(e){}try{closeRatingPopup()}catch(e){}try{closeConfirmDialog()}catch(e){}document.getElementById('tomoPageModal').style.display='none';TH.style.display='none';MB.classList.remove('active-mypage');document.querySelectorAll('.category-row').forEach(r=>r.classList.remove('active-cat','picture','screenplay','adapted','international','animated'));const mn=document.querySelector('.main-inner-content');if(mn)mn.scrollTo({top:0,behavior:'smooth'});const firstNav=document.querySelector('.color-nav-item');if(firstNav&&firstNav.dataset.cat)SA(firstNav.dataset.cat)}
const NI=document.querySelectorAll('.color-nav-item'),MN=document.querySelector('.main-inner-content');
const scroll=id=>{const t=document.getElementById(id);if(t){MN.scrollTo({top:t.offsetTop-(MD.findIndex(c=>c.id===id)*8),behavior:'smooth'});SA(id)}};
MN.onscroll=()=>{if(DD.style.display==='block')TD(true);const mr=document.querySelector('.main-content').getBoundingClientRect();let aid='';const currentSects=document.querySelectorAll('.category-section');currentSects.forEach((s,i)=>{const h=s.querySelector('.rating-label'),mc=s.querySelector('.movies-container'),stk=MN.scrollTop>=s.offsetTop-MN.offsetTop-(i*8);h.classList.toggle('is-sticky',stk);if(stk){const idx=parseInt(h.dataset.idx);let tv;if(idx===4||idx===5)tv=mr.top+bannerOffset+12+24;else if(idx===6||idx===7||idx===8)tv=mr.top+bannerOffset+12+24+6;else if(idx===9||idx===10)tv=mr.top+bannerOffset+12+24+6+8;else if(idx>10){tv=mr.top+bannerOffset+50+((idx-10)*8);if(idx===13)tv+=8}else tv=mr.top+bannerOffset+12+(idx*8);Object.assign(h.style,{top:`${tv}px`,left:`${mr.left+70}px`,zIndex:100+idx,width:`${(mr.width-70)*(gW(idx)/100)}px`});mc.style.paddingTop='28px';aid=s.id}else{Object.assign(h.style,{top:'',left:'',zIndex:'',width:gLW(i)});mc.style.paddingTop='6px'}});if(aid)SA(aid)};
window.addEventListener('resize',()=>{computeBannerOffset();MN.dispatchEvent(new Event('scroll'))});
[document.getElementById('movie-list-container'),document.getElementById('color-nav-container')].forEach(c=>c.onclick=e=>{const t=e.target.closest('[data-cat]');if(t)scroll(t.dataset.cat)});
SA(MD[0].id);
const sl=document.getElementById('slogan-text');const F1={to:'<span style="color:#e94560">To</span>',r:'<span style="color:#000">Rated</span>',mo:'<span style="color:#e94560">Mo</span>',l:'<span style="color:#000">List</span>'};const F2={to:'<span style="color:#e94560">To</span><span style="color:#000">p</span>',r:'<span style="color:#000">Rated</span>',mo:'<span style="color:#e94560">Mo</span><span style="color:#000">vies</span>',l:'<span style="color:#000">List</span>'};let isT=false;setInterval(()=>{const bg=isT?'#f0f0f5':'#fdf2d0';LA.style.setProperty('background',bg,'important');['to','r','mo','l'].forEach(k=>{const g=document.getElementById(`${k}-group`),n=isT?F1[k]:F2[k];g.style.opacity='0';setTimeout(()=>{g.innerHTML=n;g.style.opacity='1';g.classList.toggle('accent-color',n.includes('color:#e94560'))},300)});sl.style.opacity='0';setTimeout(()=>{sl.innerHTML=isT?'For best curated cinema':'The best, for the best cinema library';sl.style.opacity='1'},300);isT=!isT},3000);
const si=document.getElementById('searchInput'),ss=document.getElementById('searchSuggestions');
let searchIndex=[];
function buildSearchIndex(){const results=[];(movieDB||[]).forEach((m,i)=>{if(!m||!m.title)return;results.push({title:String(m.title||''),subtitle:String(m.subtitle||''),year:String(m.year||''),genre:String(m.genre||''),poster:m.poster||'',source:'Main',sourceClass:'source-main',action:()=>{let posterEl=null;const posters=document.querySelectorAll('.movie-poster');for(let p of posters){if(p.dataset.movieTitle===m.title&&(p.dataset.movieSubtitle||'')===(m.subtitle||'')&&String(p.dataset.movieYear)===String(m.year)){posterEl=p;break;}}if(posterEl){posterEl.click();}else{zoomMovieFromSearch({title:m.title,subtitle:m.subtitle,year:m.year,genre:m.genre,poster:m.poster});}}});});(moreMoviesDB||[]).forEach((m,i)=>{if(!m||!m.poster||!m.title)return;results.push({title:String(m.title||''),subtitle:String(m.subtitle||''),year:String(m.year||''),genre:String(m.genre||''),poster:m.poster,source:'More',sourceClass:'source-more',action:()=>openMoreZoom(i)});});const oscarSources=[{data:D,type:'picture',name:'Best Picture'},{data:S2,type:'screenplay',name:'Screenplay'},{data:AS2,type:'adapted',name:'Adapted'},{data:IF,type:'international',name:'International'},{data:AF,type:'animated',name:'Animated'}];oscarSources.forEach(({data,type,name})=>{Object.keys(data).forEach(year=>{data[year].forEach((m,i)=>{results.push({title:m.t,subtitle:'',year:String(m.y||''),genre:m.g,poster:m.p,source:name,sourceClass:`source-${type}`,action:()=>openOscarZoom(parseInt(year),i,type)});});});});return results;}
function performSearch(term){if(!term||term.trim().length<1){ss.classList.remove('active');return;}const q=term.toLowerCase().trim();let matches=[];try{const currentIndex=buildSearchIndex();matches=currentIndex.filter(m=>{try{const fullTitle=((m.title||'')+' '+(m.subtitle||'')).toLowerCase();const yearStr=String(m.year||'');const genreStr=(m.genre||'').toLowerCase();return fullTitle.includes(q)||(yearStr&&yearStr.includes(q))||(genreStr&&genreStr.includes(q));}catch(inner){return false;}});}catch(err){ss.classList.remove('active');return;}if(matches.length===0){ss.classList.remove('active');return;}displaySearchResults(matches.slice(0,20));}
function displaySearchResults(results){if(results.length===0){ss.classList.remove('active');return;}ss.innerHTML=results.map(m=>`<div class="search-suggestion-item" data-title="${m.title}" data-year="${m.year}"><img class="search-suggestion-poster" src="${m.poster}" onerror="this.src='https://placehold.co/300x450/2d3748/ffffff?text=Movie'"><div class="search-suggestion-info"><span class="search-suggestion-title">${m.title} ${m.subtitle||''}</span><div class="search-suggestion-meta"><span>${m.year}</span><span class="search-suggestion-source ${m.sourceClass||'source-main'}">${m.source||'DB'}</span></div></div></div>`).join('');ss.classList.add('active');document.querySelectorAll('.search-suggestion-item').forEach(item=>{item.addEventListener('click',function(e){e.stopPropagation();const movie=results.find(m=>m.title===this.dataset.title&&m.year==this.dataset.year);if(movie){if(movie.action)movie.action();else zoomMovieFromSearch(movie);}si.value='';ss.classList.remove('active');si.blur();});});}
function zoomMovieFromSearch(m){if(CZ){CZ.style.display='none';}if(LA.classList.contains('is-zoomed')){LA.classList.remove('is-zoomed')}document.getElementById('zoomOverlayOscar').classList.remove('active');currentZoomedMovie={title:m.title,subtitle:m.subtitle||'',year:m.year,genre:m.genre,poster:m.poster};saveLastZoomed(currentZoomedMovie);ZO.classList.add('active');PB.style.display='flex';document.getElementById('zmTitle').textContent=(m.title+' '+(m.subtitle||'')).trim();document.getElementById('zmMeta').textContent=`${m.year} • ${m.genre}`;document.getElementById('zoomedDetails').style.display='block';document.getElementById('morePrevArrow').style.display='none';document.getElementById('moreNextArrow').style.display='none';document.getElementById('moreCounter').style.display='none';SL.style.display='none';zoomMode='none';if(!CZ){CZ=document.createElement('img');CZ.className='movie-poster is-zoomed';CZ.onclick=(e)=>{e.stopPropagation();closeMoreZoom()};document.body.appendChild(CZ)}CZ.src=m.poster;CZ.style.display='block'}
if(si&&ss){si.addEventListener('input',()=>performSearch(si.value));document.addEventListener('click',function(e){if(!si.contains(e.target)&&!ss.contains(e.target))ss.classList.remove('active');});ss.addEventListener('mousedown',function(e){e.preventDefault();});}
function getMovieDataFromNode(node){const img=node.querySelector('img.movie-poster')||node.querySelector('img');return{id:node.dataset.movieId||'',title:img?(img.dataset.movieTitle||''):'',subtitle:img?(img.dataset.movieSubtitle||''):'',year:img?(img.dataset.movieYear||''):'',genre:img?(img.dataset.movieGenre||''):'',poster:img?img.src:''};}
function buildMainNode(data,rank){const div=document.createElement('div');div.className='movie-card';div.dataset.movieId=data.id;const dBtn=(data.id)?`<div class="admin-delete-btn" onclick="softDeleteMovie('${data.id}', this, event)">✕</div>`:'';div.innerHTML=`<span class="movie-rank">${rank}.</span><div class="poster-container" style="position:relative;"><img src="${data.poster}" class="movie-poster" onerror="this.src='https://placehold.co/450x675/2d3748/ffffff?text=Error'" data-movie-title="${data.title}" data-movie-subtitle="${data.subtitle}" data-movie-year="${data.year}" data-movie-genre="${data.genre}">${dBtn}</div><div class="movie-details"><h3 class="text-xs font-bold text-gray-800 uppercase tracking-wider">${data.title}</h3><h3 class="text-base font-bold text-gray-800 -mt-1">${data.subtitle}</h3><p class="text-xs text-gray-500 mt-1">${data.year}</p><p class="text-xs text-gray-600 mt-1">${data.genre}</p>${movieActionLinks(data)}</div>`;return div;}
function buildMoreNode(data,index){const div=document.createElement('div');div.style.cssText="flex:0 0 33.3333%;aspect-ratio:2/3;overflow:hidden;cursor:pointer;position:relative;";div.dataset.movieId=data.id;div.dataset.moreIndex=index;const dBtn=(data.id)?`<div class="admin-delete-btn" onclick="softDeleteMovie('${data.id}', this, event)">✕</div>`:'';div.innerHTML=`<img src="${data.poster}" class="movie-poster" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.src='https://placehold.co/300x450/2d3748/ffffff?text=${encodeURIComponent(data.title)}'" data-movie-title="${data.title}" data-movie-subtitle="${data.subtitle}" data-movie-year="${data.year}" data-movie-genre="${data.genre}">${dBtn}`;return div;}
function refreshSectionTotals(){document.querySelectorAll('.category-section').forEach(section=>{const totalEl=section.querySelector('.rating-total');if(!totalEl)return;let count=0;if(section.classList.contains('more-section')){count=section.querySelectorAll('.movies-container > div:not(.empty-slot)').length;}else{count=section.querySelectorAll('.movie-card').length;}totalEl.textContent=`Total: ${count}`;});}
function initDragAndDrop(){if(!isLoggedIn||!isUserAdmin)return;document.body.classList.add('admin-drag-active');const containers=document.querySelectorAll('.movies-container');containers.forEach(container=>{if(container.sortableInstance)container.sortableInstance.destroy();container.sortableInstance=new Sortable(container,{group:'shared',animation:200,delay:300,delayOnTouchOnly:true,ghostClass:'sortable-ghost',filter:'.empty-slot',onEnd:async function(evt){const item=evt.item;const toContainer=evt.to;const fromContainer=evt.from;const toSection=toContainer.closest('.category-section');const fromSection=fromContainer.closest('.category-section');const isToMore=toSection.classList.contains('more-section');const isFromMore=fromSection.classList.contains('more-section');let finalItem=item;if(isToMore!==isFromMore){const movieData=getMovieDataFromNode(item);if(isToMore)finalItem=buildMoreNode(movieData,0);else finalItem=buildMainNode(movieData,0);item.parentNode.replaceChild(finalItem,item);attachMainActionEvents();const newPoster=finalItem.querySelector('.movie-poster');if(newPoster)bindPosterClick(newPoster);}let movieId=finalItem.dataset.movieId;let newGrade=toSection.id.replace('rating-','');if(newGrade==='More')newGrade=null;let newPos=Array.from(toContainer.children).indexOf(finalItem);if(!movieId||movieId==='undefined'||movieId===''){const movieData=getMovieDataFromNode(finalItem);if(!movieData.title||movieData.title==='Empty')return;const{data,error}=await supabaseClient.from('movies').insert([{title:movieData.title,subtitle:movieData.subtitle,year:Number(movieData.year)||null,genre:movieData.genre,poster_url:movieData.poster,site_grade:newGrade,site_position:newPos,is_active:true}]).select();if(error){showToast('❌ Failed',error.message);}else if(data&&data[0]){movieId=data[0].id;finalItem.dataset.movieId=movieId;const delBtn=finalItem.querySelector('.admin-delete-btn');if(delBtn)delBtn.setAttribute('onclick',`softDeleteMovie('${movieId}', this, event)`);}}updateGlobalRanks();refreshSectionTotals();if(!movieId)return;try{const{error:e1}=await supabaseClient.from('movies').update({site_grade:newGrade}).eq('id',movieId);if(e1)throw e1;const updatePositions=async(section)=>{const children=section.querySelectorAll('[data-movie-id]');const promises=[];children.forEach((child,index)=>{const childId=child.dataset.movieId;if(childId&&childId!=='undefined'&&childId!==''){promises.push(supabaseClient.from('movies').update({site_position:index}).eq('id',childId));}});const results=await Promise.all(promises);const errorRes=results.find(r=>r.error);if(errorRes)throw errorRes.error;};await updatePositions(toSection);if(fromSection&&fromSection!==toSection)await updatePositions(fromSection);const localMovie=movieDB.find(m=>m.id==movieId);if(localMovie)localMovie.site_grade=newGrade;showToast('✅ Order saved','');}catch(error){showToast('❌ Failed',error.message||'');await loadHomepageFromDB();}}});});}
document.addEventListener('contextmenu',function(e){if(document.body.classList.contains('admin-drag-active')&&e.target.tagName==='IMG')e.preventDefault();});
function updateGlobalRanks(){const allMovieCards=document.querySelectorAll('.movie-card');let counter=1;allMovieCards.forEach(card=>{const rankEl=card.querySelector('.movie-rank');if(rankEl)rankEl.textContent=`${counter}.`;counter++;});}
function bindPosterClick(p){p.onclick=e=>{e.stopPropagation();closeOptionsDropdown();if(CZ||LA.classList.contains('is-zoomed'))CZf();let idx=parseInt(p.dataset.moreIndex);if(isNaN(idx)){const w=p.closest('[data-more-index]');if(w)idx=parseInt(w.dataset.moreIndex);}if(!isNaN(idx)&&idx>=0&&idx<moreMoviesDB.length&&moreMoviesDB[idx].poster){openMoreZoom(idx)}else{const section=p.closest('.category-section');if(section&&!section.classList.contains('more-section')){openSectionZoom(p)}else{const title=p.dataset.movieTitle,subtitle=p.dataset.movieSubtitle||'',year=p.dataset.movieYear,genre=p.dataset.movieGenre||'',poster=p.src;if(title&&title!=='Empty'){currentZoomedMovie={title,subtitle,year,genre,poster};saveLastZoomed(currentZoomedMovie);ZO.classList.add('active');PB.style.display='flex';document.getElementById('zmTitle').textContent=(title+' '+subtitle).trim();document.getElementById('zmMeta').textContent=`${year} • ${genre}`;document.getElementById('zoomedDetails').style.display='block';document.getElementById('morePrevArrow').style.display='none';document.getElementById('moreNextArrow').style.display='none';document.getElementById('moreCounter').style.display='none';SL.style.display='none';zoomMode='none';if(!CZ){CZ=document.createElement('img');CZ.className='movie-poster is-zoomed';CZ.onclick=(ev)=>{ev.stopPropagation();closeMoreZoom()};document.body.appendChild(CZ);}CZ.src=poster;CZ.style.display='block';}}}}};
document.addEventListener('DOMContentLoaded',async()=>{
    document.getElementById('categoriesContainer').innerHTML=['Best Picture','Best Original Screenplay','Best Adapted Screenplay','Best International Feature','Best Animated Feature'].map((c,i)=>{let n=c;if(c==='Best International Feature')n='Best <span class="category-name-sm">International</span> Feature';let onclick='';if(i===0)onclick='onclick="openModal(\'picture\')"';else if(i===1)onclick='onclick="openModal(\'screenplay\')"';else if(i===2)onclick='onclick="openModal(\'adapted\')"';else if(i===3)onclick='onclick="openModal(\'international\')"';else if(i===4)onclick='onclick="openModal(\'animated\')"';return`<div class="category-row" ${onclick}><div class="oscar-statue-container">${G('s')}</div><div class="category-info"><span class="category-name">${n}</span><span class="oscar-brand">OSCARS</span></div></div>`}).join('');
    FSI.innerHTML=G(0);
    await loadOscarFromDB();
    await loadMarqueeFromDB();
    await loadHeaderMediaFromDB();
    renderOscarModals();
    renderMyPage();
    attachMainActionEvents();
    updateTrashCount();
    injectLoginButtons();
    attachAuthListener();
    await restoreSession();
    await loadHomepageFromDB();
    await updateLoginUI();
    setTimeout(()=>{computeBannerOffset();MN.dispatchEvent(new Event('scroll'));},200);
});
function toggleYearCard(id){const card=document.getElementById(id);if(!card)return;if(id.includes('2025')||id.includes('2024')||id.includes('2023'))return;card.classList.toggle('collapsed')}
let draggedItem=null,draggedRating=null,draggedIndex=null,draggedType=null;
function attachDragEvents(){document.querySelectorAll('.mypage-movie-item').forEach(item=>{item.removeEventListener('dragstart',handleDragStart);item.removeEventListener('dragend',handleDragEnd)});document.querySelectorAll('.rating-group-items,.watchlater-list-container').forEach(group=>{group.removeEventListener('dragover',handleDragOver);group.removeEventListener('drop',handleDrop);group.removeEventListener('dragenter',handleDragEnter);group.removeEventListener('dragleave',handleDragLeave)});document.querySelectorAll('.mypage-movie-item[draggable="true"]').forEach(item=>{item.addEventListener('dragstart',handleDragStart);item.addEventListener('dragend',handleDragEnd)});document.querySelectorAll('.rating-group-items,.watchlater-list-container').forEach(group=>{group.addEventListener('dragover',handleDragOver);group.addEventListener('drop',handleDrop);group.addEventListener('dragenter',handleDragEnter);group.addEventListener('dragleave',handleDragLeave)})}
function handleDragStart(e){draggedItem=this;if(this.dataset.rating){draggedType='ratings';draggedRating=this.dataset.rating;draggedIndex=parseInt(this.dataset.index)}else{draggedType='watchlater';draggedRating=null;draggedIndex=parseInt(this.dataset.wlIndex)}const ghost=document.createElement('div');ghost.style.opacity='0';e.dataTransfer.setDragImage(ghost,0,0);e.dataTransfer.effectAllowed='move';setTimeout(()=>{this.style.opacity='0.4';this.style.transform='scale(0.95)'},0)}
function handleDragEnd(e){if(draggedItem){draggedItem.style.opacity='1';draggedItem.style.transform=''}document.querySelectorAll('.mypage-movie-item').forEach(el=>el.classList.remove('drag-target'));document.querySelectorAll('.rating-group-items,.watchlater-list-container').forEach(g=>g.classList.remove('drag-over'));draggedItem=null;draggedRating=null;draggedIndex=null;draggedType=null}
function handleDragOver(e){e.preventDefault();e.dataTransfer.dropEffect='move';if(draggedType==='ratings'){const gr=this.closest('.rating-group');if(!gr)return;this.querySelectorAll('.mypage-movie-item').forEach(el=>el.classList.remove('drag-target'));const ti=e.target.closest('.mypage-movie-item');if(ti&&ti!==draggedItem&&ti.dataset.rating===draggedRating){ti.classList.add('drag-target')}}else if(draggedType==='watchlater'){if(!this.classList.contains('watchlater-list-container'))return;this.querySelectorAll('.mypage-movie-item').forEach(el=>el.classList.remove('drag-target'));const ti=e.target.closest('.mypage-movie-item');if(ti&&ti!==draggedItem&&ti.dataset.wlIndex!==undefined){ti.classList.add('drag-target')}}}
function handleDragEnter(e){e.preventDefault();if(draggedType==='ratings'){const gr=this.closest('.rating-group');if(gr&&gr.dataset.rating===draggedRating)this.classList.add('drag-over')}else if(draggedType==='watchlater'){if(this.classList.contains('watchlater-list-container'))this.classList.add('drag-over')}}
function handleDragLeave(e){this.classList.remove('drag-over')}
async function handleDrop(e){e.preventDefault();e.stopPropagation();this.classList.remove('drag-over');document.querySelectorAll('.mypage-movie-item').forEach(el=>el.classList.remove('drag-target'));if(!draggedItem)return;if(draggedType==='ratings'){const tg=this.closest('.rating-group');if(!tg){showToast('❌ Cannot move','');return}if(tg.dataset.rating!==draggedRating){showToast('❌ Same group only','');return}const ti=e.target.closest('.mypage-movie-item');if(!ti||ti===draggedItem||ti.dataset.rating!==draggedRating)return;await updateRatingsOrder(draggedRating,draggedIndex,parseInt(ti.dataset.index));renderMyPage();}else if(draggedType==='watchlater'){if(!this.classList.contains('watchlater-list-container')){showToast('❌ Cannot move','');return}const ti=e.target.closest('.mypage-movie-item');if(!ti||ti===draggedItem||ti.dataset.wlIndex===undefined)return;const tIdx=parseInt(ti.dataset.wlIndex);const temp=myWatchLater[draggedIndex];myWatchLater.splice(draggedIndex,1);myWatchLater.splice(tIdx,0,temp);showToast('✅ Updated','');renderMyPage();if(isLoggedIn){const validSession=await ensureValidSession();if(!validSession)return;for(let i=0;i<myWatchLater.length;i++){const item=myWatchLater[i];item.position=i;if(item.dbId){try{await supabaseClient.from('watch_later').update({position:i}).eq('id',item.dbId);}catch(err){}}}}}}
async function updateRatingsOrder(rating,fromIdx,toIdx){const same=[];myRatings.forEach((item,i)=>{if(item.rating===parseFloat(rating))same.push({...item,_origIndex:i})});const temp=same[fromIdx];same.splice(fromIdx,1);same.splice(toIdx,0,temp);const nr=[];let c=0;myRatings.forEach(item=>{if(item.rating===parseFloat(rating)){const ni=same[c];nr.push({movie:ni.movie,rating:ni.rating,dbId:ni.dbId,position:ni.position});c++}else nr.push(item)});myRatings=nr;showToast('✅ Updated','');if(isLoggedIn){const validSession=await ensureValidSession();if(!validSession)return;const itemsInGroup=myRatings.filter(r=>r.rating===parseFloat(rating));for(let i=0;i<itemsInGroup.length;i++){const item=itemsInGroup[i];item.position=i;if(item.dbId){try{await supabaseClient.from('ratings').update({position:i}).eq('id',item.dbId);}catch(err){}}}}}
async function restoreSession(){try{const{data:{session},error}=await supabaseClient.auth.getSession();if(error){sessionReady=true;return;}if(!session||!session.user){isLoggedIn=false;currentUser='';currentUserId='';isUserAdmin=false;sessionReady=true;await updateLoginUI();return;}isLoggedIn=true;currentUser=(session.user.email||'').replace('@tomo.local','')||'user';currentUserId=session.user.id;sessionReady=true;await updateLoginUI();await loadUserLibrary();}catch(e){sessionReady=true;}}
let currentListId=null;let currentListOwnerId=null;let currentListData=null;let currentListLiked=false;
function escapeHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function formatDate(iso){try{const d=new Date(iso);const now=new Date();const diff=(now-d)/1000;if(diff<60)return 'just now';if(diff<3600)return Math.floor(diff/60)+'m ago';if(diff<86400)return Math.floor(diff/3600)+'h ago';if(diff<604800)return Math.floor(diff/86400)+'d ago';return d.toLocaleDateString();}catch(e){return '';}}
async function openGallery(){closeOptionsDropdown();document.getElementById('galleryModalOverlay').classList.add('active');currentGalleryTab='all';document.getElementById('tabAllLists').classList.add('active');document.getElementById('tabMyLists').classList.remove('active');await loadGallery();}
function closeGallery(){document.getElementById('galleryModalOverlay').classList.remove('active');}
function switchGalleryTab(tab){
    if(tab==='my' && !isLoggedIn){
        currentGalleryTab='my';
        document.getElementById('tabAllLists').classList.remove('active');
        document.getElementById('tabMyLists').classList.add('active');
        document.getElementById('galleryGrid').innerHTML='<div class="gallery-empty">Sign in.</div>';
        pendingLoginAction = () => { switchGalleryTab('my'); }; 
        openLoginModal();
        return;
    }
    currentGalleryTab=tab;
    document.getElementById('tabAllLists').classList.toggle('active',tab==='all');
    document.getElementById('tabMyLists').classList.toggle('active',tab==='my');
    loadGallery();
}
async function loadGallery(){const grid=document.getElementById('galleryGrid');grid.innerHTML='<div class="gallery-empty">Loading...</div>';try{let query=supabaseClient.from('published_lists').select('id, user_id, title, description, views_count, created_at').eq('is_active',true).order('created_at',{ascending:false}).limit(60);if(currentGalleryTab==='my')query=query.eq('user_id',currentUserId);const{data:lists,error}=await query;if(error)throw error;if(!lists||lists.length===0){grid.innerHTML=`<div class="gallery-empty">${currentGalleryTab==='my'?'No lists yet.':'No published lists.'}</div>`;return;}const listIds=lists.map(l=>l.id);const userIds=[...new Set(lists.map(l=>l.user_id))];const[moviesRes,likesRes,profilesRes]=await Promise.all([supabaseClient.from('published_list_movies').select('list_id, movie_poster, position').in('list_id',listIds).order('position',{ascending:true}),supabaseClient.from('likes').select('list_id, user_id').in('list_id',listIds),supabaseClient.from('profiles').select('id, username').in('id',userIds)]);const moviesByList={};(moviesRes.data||[]).forEach(m=>{(moviesByList[m.list_id]=moviesByList[m.list_id]||[]).push(m);});const likesByList={};(likesRes.data||[]).forEach(l=>{likesByList[l.list_id]=(likesByList[l.list_id]||0)+1;});const userLikesSet=new Set();(likesRes.data||[]).forEach(l=>{if(isLoggedIn&&l.user_id===currentUserId)userLikesSet.add(l.list_id);});const nameById={};(profilesRes.data||[]).forEach(p=>{nameById[p.id]=p.username;});grid.innerHTML=lists.map(list=>{const listMovies=moviesByList[list.id]||[];const posters=listMovies.slice(0,5).map((m, i)=>`<div class="gallery-poster-wrapper"><img src="${m.movie_poster}" onerror="this.src='https://placehold.co/300x450/2d3748/ffffff?text=Movie'"><span class="number-badge">${i + 1}</span></div>`).join('');const likesCount=likesByList[list.id]||0;const author=nameById[list.user_id]||'user';const isOwner=isLoggedIn&&currentUserId===list.user_id;const isAdmin=isUserAdmin;const showActions=isOwner||isAdmin;const isLiked=userLikesSet.has(list.id);const heartIcon=isLiked?'❤️':'🤍';const heartColor=isLiked?'#ef4444':'#6b7280';return `<div class="gallery-card" onclick="openListDetail('${list.id}')"><div class="gallery-card-posters">${posters||'<div style="grid-column:1/-1;background:#222"></div>'}</div><div class="gallery-card-body"><div style="display:flex;justify-content:space-between;align-items:center;width:100%;"><div style="display:flex;align-items:baseline;gap:8px;min-width:0;flex-wrap:wrap;"><div class="gallery-card-title" style="margin-bottom:0;font-size:0.75rem;">${escapeHtml(list.title)}</div><div class="gallery-card-author" style="margin-bottom:0;font-size:0.6rem;">by ${escapeHtml(author)}</div></div>${showActions?`<div class="gallery-card-actions" style="margin-top:0;width:auto;"><button class="edit-btn" onclick="event.stopPropagation(); quickEditList('${list.id}')">✏️</button><button class="delete-btn" onclick="event.stopPropagation(); quickDeleteList('${list.id}', this)">🗑️</button></div>`:''}</div><div style="display:flex;justify-content:flex-start;align-items:center;width:100%;"><div class="gallery-card-meta" style="flex-direction:row;gap:12px;font-size:0.55rem;text-align:left;"><span>🎬 ${listMovies.length} movies</span><span class="gallery-card-likes" style="cursor:pointer; padding:2px 6px; border-radius:4px; background:rgba(0,0,0,0.05); color:${heartColor}; font-weight:${isLiked?'800':'600'};" onclick="toggleGalleryLike('${list.id}', this, event)">${heartIcon} ${likesCount}</span></div></div></div></div>`;}).join('');}catch(e){grid.innerHTML='<div class="gallery-empty">Failed.</div>';}}
async function toggleGalleryLike(listId, element, event) {
    if(event) event.stopPropagation();
    if(!isLoggedIn) {
        pendingLoginAction = () => toggleGalleryLike(listId, element);
        showToast('🔒 Sign in','');
        openLoginModal();
        return;
    }
    if(!element || !element.isConnected) {
        await loadGallery();
        return;
    }
    const isCurrentlyLiked = element.textContent.includes('❤️');
    const currentCount = parseInt(element.textContent.replace(/[^0-9]/g, '')) || 0;
    const newCount = isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1;
    element.innerHTML = (isCurrentlyLiked ? '🤍' : '❤️') + ' ' + newCount;
    element.style.color = isCurrentlyLiked ? '#6b7280' : '#ef4444';
    element.style.fontWeight = isCurrentlyLiked ? '600' : '800';
    try {
        if(isCurrentlyLiked) {
            const { error } = await supabaseClient.from('likes').delete().eq('list_id', listId).eq('user_id', currentUserId);
            if(error) throw error;
        } else {
            const { error } = await supabaseClient.from('likes').insert([{ list_id: listId, user_id: currentUserId }]);
            if(error) throw error;
        }
    } catch(e) {
        element.innerHTML = (isCurrentlyLiked ? '❤️' : '🤍') + ' ' + currentCount;
        element.style.color = isCurrentlyLiked ? '#ef4444' : '#6b7280';
        element.style.fontWeight = isCurrentlyLiked ? '800' : '600';
        showToast('❌ Failed','');
    }
}
function quickDeleteList(listId,btnEl){showCustomConfirm('Delete this list?','Cannot undo.','Yes, Delete',async()=>{try{const{error}=await supabaseClient.from('published_lists').update({is_active:false}).eq('id',listId);if(error)throw error;showToast('🗑️ Deleted','');if(btnEl)btnEl.closest('.gallery-card').remove();}catch(e){showToast('❌ '+(e.message?e.message.substring(0,120):'Failed'),'');}});}
function quickEditList(listId){openEditList(listId);}
function editListFromDetail(){if(currentListId)openEditList(currentListId);}
async function openListDetail(listId){
    if(!sessionReady){await new Promise(resolve=>{const check=()=>sessionReady?resolve():setTimeout(check,100);check();setTimeout(resolve,3000);});}
    try{const{data:{session}}=await supabaseClient.auth.getSession();if(session&&session.user){isLoggedIn=true;currentUser=(session.user.email||'').replace('@tomo.local','')||'user';currentUserId=session.user.id;}}catch(e){}
    currentListId=listId;currentListLiked=false;
    document.getElementById('listDetailOverlay').classList.add('active');
    document.getElementById('listDetailTitle').textContent='Loading...';
    document.getElementById('listDetailDesc').textContent='';
    document.getElementById('listDetailAuthor').textContent='';
    document.getElementById('listDetailMovies').innerHTML='';
    document.getElementById('commentsList').innerHTML='';
    document.getElementById('listLikeCount').textContent='0';
    document.getElementById('listDeleteBtn').style.display='none';
    document.getElementById('listEditBtn').style.display='none';
    document.getElementById('commentInputRow').style.display='none';
    document.getElementById('commentCharCounter').style.display='none';
    const likeBtn = document.getElementById('listLikeBtn');
    likeBtn.disabled = true;
    likeBtn.style.opacity = '0.5';
    try{
        const{data:list,error}=await supabaseClient.from('published_lists').select('id, user_id, title, description, views_count, created_at').eq('id',listId).maybeSingle();
        if(error)throw error;
        if(!list){showToast('Not found','❌');closeListDetail();return;}
        currentListData=list;
        currentListOwnerId=list.user_id;
        try{await supabaseClient.from('published_lists').update({views_count:(list.views_count||0)+1}).eq('id',listId);}catch(e){}
        document.getElementById('listDetailTitle').textContent=list.title||'—';
        document.getElementById('listDetailDesc').textContent=list.description||'';
        
        // Dynamic Meta Update for Social Share
        try {
            document.title = list.title || 'Tomo.com List';
            let firstPoster = 'https://placehold.co/600x315/1a1a2e/FFD700?text=Tomo.com';
            let ogImg = document.querySelector('meta[property="og:image"]');
            if(!ogImg) { ogImg = document.createElement('meta'); ogImg.setAttribute('property', 'og:image'); document.head.appendChild(ogImg); }
            ogImg.setAttribute('content', firstPoster);
            
            let ogTitle = document.querySelector('meta[property="og:title"]');
            if(!ogTitle) { ogTitle = document.createElement('meta'); ogTitle.setAttribute('property', 'og:title'); document.head.appendChild(ogTitle); }
            ogTitle.setAttribute('content', list.title || 'Tomo.com List');
        } catch(e) { console.error(e); }

        const{data:prof}=await supabaseClient.from('profiles').select('username').eq('id',list.user_id).maybeSingle();
        const authorName=prof?.username||'user';
        document.getElementById('listDetailAuthor').textContent=`by ${authorName} • ${formatDate(list.created_at)}`;
        const isOwner=isLoggedIn&&currentUserId===list.user_id;
        const isAdmin=isUserAdmin;
        if(isOwner||isAdmin){document.getElementById('listDeleteBtn').style.display='flex';document.getElementById('listEditBtn').style.display='flex';}
        const{data:movies}=await supabaseClient.from('published_list_movies').select('*').eq('list_id',listId).order('position',{ascending:true});
        const moviesHtml=(movies||[]).map((m, i)=>`<div class="list-detail-movie"><div class="list-detail-movie-poster-wrap"><img src="${m.movie_poster}" onerror="this.src='https://placehold.co/300x450/2d3748/ffffff?text=Movie'"><span class="number-badge">${i + 1}</span></div><div class="list-detail-movie-info"><div class="list-detail-movie-title">${escapeHtml(m.movie_title)} ${escapeHtml(m.movie_subtitle||'')}</div><div class="list-detail-movie-year">${escapeHtml(m.movie_year||'')}</div><div class="list-detail-movie-genre">${escapeHtml(m.movie_genre||'')}</div></div><div class="list-detail-movie-rating">⭐ ${m.user_rating}/10</div></div>`).join('');
        document.getElementById('listDetailMovies').innerHTML=moviesHtml||'<div class="comments-empty">No movies</div>';
        
        // Update meta image with first movie poster if exists
        try {
            const firstMovie = (movies && movies.length > 0) ? movies[0] : null;
            if(firstMovie && firstMovie.movie_poster) {
                let ogImg = document.querySelector('meta[property="og:image"]');
                if(ogImg) ogImg.setAttribute('content', firstMovie.movie_poster);
            }
        } catch(e) {}

        const{data:likes}=await supabaseClient.from('likes').select('user_id').eq('list_id',listId);
        document.getElementById('listLikeCount').textContent=(likes||[]).length;
        currentListLiked=isLoggedIn&&(likes||[]).some(l=>l.user_id===currentUserId);
        likeBtn.classList.toggle('liked',currentListLiked);
        await loadComments();
        if(isLoggedIn){document.getElementById('commentInputRow').style.display='flex';document.getElementById('commentCharCounter').style.display='block';}else{document.getElementById('commentInputRow').style.display='none';document.getElementById('commentCharCounter').style.display='none';}
    }catch(e){
        showToast('❌ Failed','');
    } finally {
        likeBtn.disabled = false;
        likeBtn.style.opacity = '1';
    }
}
function closeListDetail(){document.getElementById('listDetailOverlay').classList.remove('active');currentListId=null;currentListOwnerId=null;currentListData=null;currentListLiked=false;document.title='Tomo.com';}
async function loadComments(){if(!currentListId)return;const{data:comments,error}=await supabaseClient.from('comments').select('id, user_id, text, created_at').eq('list_id',currentListId).order('created_at',{ascending:false}).limit(50);if(error){return;}const userIds=[...new Set((comments||[]).map(c=>c.user_id))];let nameById={};if(userIds.length){const{data:profs}=await supabaseClient.from('profiles').select('id, username').in('id',userIds);(profs||[]).forEach(p=>{nameById[p.id]=p.username;});}document.getElementById('commentCount').textContent=(comments||[]).length;const container=document.getElementById('commentsList');if(!comments||comments.length===0){container.innerHTML='<div class="comments-empty">No comments</div>';return;}container.innerHTML=comments.map(c=>{const author=nameById[c.user_id]||'user';const canDelete=isLoggedIn&&(c.user_id===currentUserId||currentUserId===currentListOwnerId||isUserAdmin);return `<div class="comment-item"><div class="comment-item-head"><span class="comment-author">${escapeHtml(author)}</span><span class="comment-date">${formatDate(c.created_at)}</span></div><div class="comment-text">${escapeHtml(c.text)}</div>${canDelete?`<button class="comment-delete" onclick="deleteComment('${c.id}')">✕</button>`:''}</div>`;}).join('');}
async function submitComment(){if(!isLoggedIn){showToast('🔒 Sign in','');return;}if(!currentListId)return;const input=document.getElementById('commentInput');const text=(input.value||'').trim();if(!text){showToast('⚠️ Empty','');return;}if(text.length>150){showToast('⚠️ Max 150','');return;}const btn=document.getElementById('commentSubmit');btn.disabled=true;try{const{error}=await supabaseClient.from('comments').insert([{list_id:currentListId,user_id:currentUserId,text}]);if(error)throw error;input.value='';document.getElementById('commentCharCounter').textContent='0 / 150';btn.disabled=true;showToast('✅ Posted','');await loadComments();}catch(e){showToast('❌ '+(e.message?e.message.substring(0,120):'Failed'),'');btn.disabled=false;}}
async function deleteComment(commentId){if(!isLoggedIn)return;showCustomConfirm('Delete comment?','','Yes',async()=>{try{const{error}=await supabaseClient.from('comments').delete().eq('id',commentId);if(error)throw error;showToast('🗑️ Deleted','');await loadComments();}catch(e){showToast('❌ Failed','');}});}
async function toggleLike(){
    if(!isLoggedIn){
        pendingLoginAction = () => toggleLike(); 
        showToast('🔒 Sign in','');
        openLoginModal();
        return;
    }
    if(!currentListId) return;
    if(!currentListData) { showToast('Wait for list to load', '⏳'); return; }
    const btn=document.getElementById('listLikeBtn');
    if(btn.disabled) return; 
    btn.disabled = true; 
    const countEl=document.getElementById('listLikeCount');
    const wasLiked=currentListLiked;
    const oldCount=parseInt(countEl.textContent)||0;
    currentListLiked=!wasLiked;
    btn.classList.toggle('liked',currentListLiked);
    countEl.textContent=wasLiked?Math.max(0,oldCount-1):oldCount+1;
    try{
        if(wasLiked){
            const{error}=await supabaseClient.from('likes').delete().eq('list_id',currentListId).eq('user_id',currentUserId);
            if(error)throw error;
        }else{
            const{error}=await supabaseClient.from('likes').insert([{list_id:currentListId,user_id:currentUserId}]);
            if(error)throw error;
        }
    }catch(e){
        currentListLiked=wasLiked;
        btn.classList.toggle('liked',wasLiked);
        countEl.textContent=oldCount;
        showToast('❌ Failed','');
    } finally {
        btn.disabled = false; 
    }
}
async function shareList(){
    if(!currentListData)return;
    const url=window.location.origin+window.location.pathname+'#list-'+currentListId;
    
    // Grab the first image from the list to share
    let shareImageUrl = 'https://placehold.co/600x400/1a1a2e/FFD700?text=Tomo.com';
    const firstMovieImg = document.querySelector('#listDetailMovies img');
    if(firstMovieImg && firstMovieImg.src) {
        shareImageUrl = firstMovieImg.src;
    }

    const shareData={
        title:currentListData.title||'Tomo.com List',
        text:(currentListData.description||'Check out this movie list on Tomo.com'),
        url: url
    };
    
    try{
        if(navigator.share){
            // Try sharing with the image file if the browser supports it
            if(navigator.canShare && firstMovieImg) {
                try {
                    const response = await fetch(shareImageUrl);
                    const blob = await response.blob();
                    const file = new File([blob], 'poster.jpg', { type: blob.type });
                    if (navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            ...shareData,
                            files: [file]
                        });
                        return; // Exit if successful
                    }
                } catch(err) {
                    console.log('File share not supported or failed', err);
                }
            }
            // Fallback to standard URL share
            await navigator.share(shareData);
        }else if(navigator.clipboard){
            await navigator.clipboard.writeText(url);
            showToast('✅ Copied','');
        }else{
            prompt('Copy:',url);
        }
    }catch(e){
        if(e.name!=='AbortError'){
            try{
                await navigator.clipboard.writeText(url);
                showToast('✅ Copied','');
            }catch(err){}
        }
    }
}
function confirmDeleteList(){if(!currentListId){showToast('❌','');return;}if(!isLoggedIn){showToast('🔒','');return;}const isOwner=currentUserId===currentListOwnerId;const isAdmin=isUserAdmin;if(!isOwner&&!isAdmin){showToast('❌','');return;}showCustomConfirm('Delete this list?','Cannot undo.','Yes',async()=>{try{const{error}=await supabaseClient.from('published_lists').update({is_active:false}).eq('id',currentListId);if(error)throw error;showToast('🗑️ Deleted','');closeListDetail();await loadGallery();}catch(e){showToast('❌ '+(e.message?e.message.substring(0,120):'Failed'),'');}});}
function openCreateList(){if(!isLoggedIn){showToast('🔒 Sign in','');openLoginModal();return;}editingListId=null;document.getElementById('createListModalTitle').textContent='📝 Create New List';document.getElementById('createListPublishBtn').textContent='✅ Publish';document.getElementById('createListTitle').value='';document.getElementById('createListDesc').value='';renderCreateListMovies();document.getElementById('createListOverlay').classList.add('active');}
function closeCreateList(){document.getElementById('createListOverlay').classList.remove('active');editingListId=null;}
async function openEditList(listId){if(!isLoggedIn){showToast('🔒','');return;}try{const{data:list,error}=await supabaseClient.from('published_lists').select('*').eq('id',listId).maybeSingle();if(error)throw error;if(!list){showToast('Not found','❌');return;}if(list.user_id!==currentUserId&&!isUserAdmin){showToast('❌','');return;}const{data:movies}=await supabaseClient.from('published_list_movies').select('movie_title, movie_subtitle, movie_year').eq('list_id',listId);const selectedKeys=new Set((movies||[]).map(m=>`${m.movie_title}|${m.movie_subtitle||''}|${m.movie_year}`));editingListId=listId;document.getElementById('createListModalTitle').textContent='📝 Edit List';document.getElementById('createListPublishBtn').textContent='💾 Save Changes';document.getElementById('createListTitle').value=list.title;document.getElementById('createListDesc').value=list.description||'';renderCreateListMovies(selectedKeys);document.getElementById('createListOverlay').classList.add('active');}catch(e){showToast('❌ Failed','');}}
function renderCreateListMovies(selectedKeys=null){const container=document.getElementById('createListMovies');if(!myRatings||myRatings.length===0){container.innerHTML='<div class="create-list-empty">No rated movies yet.</div>';return;}const sorted=[...myRatings].sort((a,b)=>b.rating-a.rating);container.innerHTML=sorted.map((item,i)=>{const key=`${item.movie.title}|${item.movie.subtitle||''}|${item.movie.year}`;const isChecked=selectedKeys?selectedKeys.has(key):true;return `<label class="create-list-movie"><input type="checkbox" data-rating-idx="${i}" ${isChecked?'checked':''}><img src="${item.movie.poster}" onerror="this.src='https://placehold.co/300x450/2d3748/ffffff?text=Movie'"><div class="create-list-movie-info"><div class="create-list-movie-title">${escapeHtml(item.movie.title)} ${escapeHtml(item.movie.subtitle||'')}</div><div class="create-list-movie-meta">${escapeHtml(item.movie.year||'')} • ⭐ ${item.rating}/10</div></div></label>`;}).join('');}
async function saveList(){if(!isLoggedIn){showToast('🔒','');return;}const title=document.getElementById('createListTitle').value.trim();const desc=document.getElementById('createListDesc').value.trim();if(!title){showToast('⚠️ Title required','');return;}if(desc.length>200){showToast('⚠️ Max 200','');return;}const checkboxes=document.querySelectorAll('#createListMovies input[type=checkbox]:checked');if(checkboxes.length===0){showToast('⚠️ Select at least one','');return;}const sorted=[...myRatings].sort((a,b)=>b.rating-a.rating);const selectedMovies=Array.from(checkboxes).map(cb=>sorted[parseInt(cb.dataset.ratingIdx)]);const btn=document.getElementById('createListPublishBtn');btn.disabled=true;try{if(editingListId){const{error:e1}=await supabaseClient.from('published_lists').update({title,description:desc}).eq('id',editingListId);if(e1)throw e1;const{error:e2}=await supabaseClient.from('published_list_movies').delete().eq('list_id',editingListId);if(e2)throw e2;const movieRows=selectedMovies.map((item,i)=>({list_id:editingListId,movie_title:item.movie.title,movie_subtitle:item.movie.subtitle||'',movie_year:item.movie.year||'',movie_genre:item.movie.genre||'',movie_poster:item.movie.poster,user_rating:item.rating,position:i}));const{error:e3}=await supabaseClient.from('published_list_movies').insert(movieRows);if(e3)throw e3;showToast('✅ Updated','');closeCreateList();if(document.getElementById('listDetailOverlay').classList.contains('active')&&currentListId===editingListId){await openListDetail(editingListId);}await loadGallery();}else{const{data:ins,error:e1}=await supabaseClient.from('published_lists').insert([{user_id:currentUserId,title,description:desc,is_active:true}]).select();if(e1)throw e1;const newListId=ins[0].id;const movieRows=selectedMovies.map((item,i)=>({list_id:newListId,movie_title:item.movie.title,movie_subtitle:item.movie.subtitle||'',movie_year:item.movie.year||'',movie_genre:item.movie.genre||'',movie_poster:item.movie.poster,user_rating:item.rating,position:i}));const{error:e2}=await supabaseClient.from('published_list_movies').insert(movieRows);if(e2)throw e2;showToast('✅ Published','');closeCreateList();await openGallery();}}catch(e){showToast('❌ '+(e.message?e.message.substring(0,120):'Failed'),'');}finally{btn.disabled=false;}}
function showCustomConfirm(title,text,btnText,callback){document.getElementById('confirmTitle').textContent=title;document.getElementById('confirmText').textContent=text;document.getElementById('confirmBtn').textContent=btnText;globalConfirmCallback=callback;document.getElementById('deleteListConfirmOverlay').classList.add('active');}
function closeDeleteListConfirm(){document.getElementById('deleteListConfirmOverlay').classList.remove('active');globalConfirmCallback=null;}
async function executeConfirmAction(){if(globalConfirmCallback){const cb=globalConfirmCallback;closeDeleteListConfirm();await cb();}}
document.getElementById('deleteListConfirmOverlay').addEventListener('click',function(e){if(e.target===this)closeDeleteListConfirm();});
document.addEventListener('DOMContentLoaded',()=>{const ci=document.getElementById('commentInput');if(ci){ci.addEventListener('input',function(){const len=this.value.length;document.getElementById('commentCharCounter').textContent=`${len} / 150`;document.getElementById('commentSubmit').disabled=len===0||len>150;});}const go=document.getElementById('galleryModalOverlay');if(go)go.addEventListener('click',e=>{if(e.target===go)closeGallery();});const lo=document.getElementById('listDetailOverlay');if(lo)lo.addEventListener('click',e=>{if(e.target===lo)closeListDetail();});const co=document.getElementById('createListOverlay');if(co)co.addEventListener('click',e=>{if(e.target===co)closeCreateList();});});
(function(){const si=document.getElementById('searchInput');const ss=document.getElementById('searchSuggestions');const sw=document.querySelector('.search-wrapper');if(!si||!ss||!sw)return;ss.style.touchAction='manipulation';ss.style.webkitOverflowScrolling='touch';function adjustSuggestions(){if(!ss.classList.contains('active'))return;const vv=window.visualViewport;if(!vv)return;const wrapRect=sw.getBoundingClientRect();const availableHeight=vv.height-wrapRect.bottom-16;if(availableHeight>80){ss.style.maxHeight=Math.min(280,availableHeight)+'px';ss.style.overflowY='auto';}}if(window.visualViewport){window.visualViewport.addEventListener('resize',adjustSuggestions);window.visualViewport.addEventListener('scroll',adjustSuggestions);}si.addEventListener('focus',()=>{setTimeout(()=>{sw.scrollIntoView({block:'nearest',behavior:'smooth'});adjustSuggestions();},250);});const observer=new MutationObserver(()=>{if(ss.classList.contains('active'))adjustSuggestions();});observer.observe(ss,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});si.addEventListener('blur',()=>{setTimeout(()=>{ss.style.maxHeight='';},300);});})();
