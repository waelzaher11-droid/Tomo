const bannerItems=[{text:'Gallery. Share your cinema taste',bg:'#fdf7ee',border:'#e8d9c2'},{text:'Gallery. Publish · Share · Discover',bg:'#eef6fc',border:'#c5dcee'},{text:'Gallery. Create &amp; share your lists',bg:'#f0fbf4',border:'#c9e8d4'},{text:'Gallery. From here, share your world',bg:'#fdf2f8',border:'#ecc8d9'},{text:'Gallery. Your ratings &amp; opinion,<br>Seen by filmmakers',bg:'#f5f3ff',border:'#d8d2f0'}];
let bannerIdx=0;
function rotateBannerText(){const el=document.getElementById('galleryBannerText');const bn=document.getElementById('galleryBanner');if(!el||!bn)return;el.style.opacity='0';setTimeout(()=>{bannerIdx=(bannerIdx+1)%bannerItems.length;const item=bannerItems[bannerIdx];el.innerHTML=item.text;bn.style.backgroundColor=item.bg;bn.style.borderColor=item.border;el.style.opacity='1';},300);}
setInterval(rotateBannerText,4500);
const cnlItems=[{text:'Start here.',bg:'#eff6ff'},{text:'Create lists from here.',bg:'#f0fdf4'},{text:'Participate here.',bg:'#fdf2f8'},{text:'Publish from here.',bg:'#fefce8'}];
let cnlIdx=0;
function rotateCreateNewList(){const el=document.getElementById('cnlBottom');if(!el)return;el.style.opacity='0';setTimeout(()=>{cnlIdx=(cnlIdx+1)%cnlItems.length;el.textContent=cnlItems[cnlIdx].text;el.style.backgroundColor=cnlItems[cnlIdx].bg;el.style.opacity='1';},350);}
setInterval(rotateCreateNewList,3500);
const MB=document.getElementById('mypageBox'),FH=document.getElementById('floatingHeader'),FSI=document.getElementById('floatingStatueIcon'),TH=document.getElementById('tomoFloatingHeader'),MO=document.getElementById('imageModalOverlay'),MI=document.getElementById('modalImageContent'),MT=document.getElementById('modalTextContent'),PA=document.getElementById('prevArrow'),NA=document.getElementById('nextArrow'),LA=document.getElementById('leftHeaderAnim'),ZO=document.getElementById('headerZoomOverlay'),PB=document.getElementById('btnClosePosterZoom'),SC=document.getElementById('squaresZoomCounter'),RC=document.getElementById('redContainer'),MC=document.getElementById('marqueeTextContent'),DD=document.getElementById('dropdownContent'),CB=document.getElementById('closeMenuBtn'),SL=document.getElementById('sectionLabel');
let myWatchLater=[],myRatings=[],trashBin=[],currentUserId='',sessionReady=false;
let currentRatingMovie=null,pendingDelete=null,currentZoomedMovie=null,currentMoreIndex=0;
let isLoggedIn=false,currentUser='',pendingLoginAction=null,isUserAdmin=false;
window._editingRatingIndex=undefined;
let zoomMode='none',currentSectionPosters=[],currentSectionIndex=0,bannerOffset=46,globalConfirmCallback=null,currentGalleryTab='all',editingListId=null;
let D={},S2={},AS2={},IF={},AF={},Z=2025,X=0,currentZoomDbId=null;
window._editingMovieId=null;
window._adminSelectedMovies=new Set();
window._adminOscarCat='picture';
function saveLastZoomed(movie){try{localStorage.setItem('lastZoomedMovie',JSON.stringify(movie));}catch(e){}}
function computeBannerOffset(){try{const mr=document.querySelector('.main-content');const b=document.querySelector('.gallery-banner');if(mr&&b){const mrRect=mr.getBoundingClientRect();const bRect=b.getBoundingClientRect();bannerOffset=(bRect.bottom-mrRect.top)+4;}}catch(e){}}
const CONTENT_TABLES={'movie':'movies','oscar_movie':'oscar_movies','header_image':'header_media','marquee_text':'marquee_messages'};
function isCurrentUserAdmin(){return isLoggedIn&&isUserAdmin;}
async function deleteContent(contentType,contentId,meta={}){if(!isCurrentUserAdmin())return{success:false,error:'Admin access required'};const table=CONTENT_TABLES[contentType];if(!table)return{success:false,error:'Unknown content type'};try{const validSession=await ensureValidSession();if(!validSession)return{success:false,error:'Session expired'};const{data,error}=await supabaseClient.from(table).update({in_trash:true,trashed_at:new Date().toISOString(),trash_meta:{...meta,trashed_by:currentUserId,original_position:meta.original_position??null}}).eq('id',contentId).select();if(error)throw error;if(!data||data.length===0)return{success:false,error:'Item not found'};return{success:true,data:data[0]};}catch(e){return{success:false,error:e.message||'Delete failed'};}}
async function restoreContent(contentType,contentId){if(!isCurrentUserAdmin())return{success:false,error:'Admin access required'};const table=CONTENT_TABLES[contentType];if(!table)return{success:false,error:'Unknown content type'};try{const validSession=await ensureValidSession();if(!validSession)return{success:false,error:'Session expired'};const{data,error}=await supabaseClient.from(table).update({in_trash:false,trashed_at:null,trash_meta:null}).eq('id',contentId).select();if(error)throw error;if(!data||data.length===0)return{success:false,error:'Item not found'};return{success:true,data:data[0]};}catch(e){return{success:false,error:e.message||'Restore failed'};}}
async function permanentlyDeleteContent(contentType,contentId){if(!isCurrentUserAdmin())return{success:false,error:'Admin access required'};const table=CONTENT_TABLES[contentType];if(!table)return{success:false,error:'Unknown content type'};try{const validSession=await ensureValidSession();if(!validSession)return{success:false,error:'Session expired'};const{error}=await supabaseClient.from(table).delete().eq('id',contentId);if(error)throw error;return{success:true};}catch(e){return{success:false,error:e.message};}}
async function getAllTrashedContent(){if(!isCurrentUserAdmin())return{movies:[],oscar:[],header:[],marquee:[]};try{const validSession=await ensureValidSession();if(!validSession)return{movies:[],oscar:[],header:[],marquee:[]};const[m,o,h,q]=await Promise.all([supabaseClient.from('movies').select('*').eq('in_trash',true).order('trashed_at',{ascending:false}),supabaseClient.from('oscar_movies').select('*').eq('in_trash',true).order('trashed_at',{ascending:false}),supabaseClient.from('header_media').select('*').eq('in_trash',true).order('trashed_at',{ascending:false}),supabaseClient.from('marquee_messages').select('*').eq('in_trash',true).order('trashed_at',{ascending:false})]);return{movies:m.data||[],oscar:o.data||[],header:h.data||[],marquee:q.data||[]};}catch(e){return{movies:[],oscar:[],header:[],marquee:[]};}}
async function softDeleteMovie(movieId,element,event){if(event)event.stopPropagation();const res=await deleteContent('movie',movieId,{title:element.closest('.movie-card, [data-movie-id]').querySelector('img').dataset.movieTitle});if(res.success){element.closest('.movie-card, [data-movie-id]').remove();updateGlobalRanks();refreshSectionTotals();showToast('🗑️ Movie moved to Content Trash','');updateContentTrashCount();}else{showToast('❌ Failed to delete',res.error);}}
async function softDeleteOscar(id,element,event){if(event)event.stopPropagation();const res=await deleteContent('oscar_movie',id,{title:'Oscar Movie'});if(res.success){showToast('🗑️ Oscar movie moved to Content Trash','');updateContentTrashCount();await loadOscarFromDB();renderOscarModals();closeOscarZoom();}else{showToast('❌ Failed to delete',res.error);}}
async function softDeleteHeaderImage(imageId){if(!imageId){showToast('⚠️ Error: Image ID missing','Please refresh');return;}HM();const res=await deleteContent('header_image',imageId,{title:'Header Image'});if(res.success){showToast('🗑️ Header image deleted','');updateContentTrashCount();await loadHeaderMediaFromDB();}else{showToast('❌ Failed',res.error);}}
function deleteHeaderImageFromSquare(btn){const wrapper=btn.closest('.square-wrapper');const activeFace=wrapper.querySelector('.face.active');if(!activeFace){showToast('⚠️','No active image.');return;}const dbId=activeFace.dataset.dbId;if(!dbId||activeFace.dataset.valid==='false'){showToast('⚠️','Image ID not found.');return;}softDeleteHeaderImage(dbId);}
function openContentTrashModal(){closeOptionsDropdown();document.getElementById('contentTrashModalOverlay').classList.add('active');renderContentTrashModal();}
function closeContentTrashModal(){document.getElementById('contentTrashModalOverlay').classList.remove('active');}
async function renderContentTrashModal(){const body=document.getElementById('contentTrashModalBody');const footer=document.getElementById('contentTrashModalFooter');body.innerHTML='<div class="trash-modal-empty">Loading...</div>';const all=await getAllTrashedContent();let total=all.movies.length+all.oscar.length+all.header.length+all.marquee.length;document.getElementById('contentTrashModalCount').textContent=total;document.getElementById('contentTrashCount').textContent=total;if(total===0){body.innerHTML='<div class="trash-modal-empty">Content Trash is empty</div>';footer.style.display='none';return;}let html='';all.movies.forEach(m=>{html+=`<div class="content-trash-modal-item"><img class="trash-item-poster" src="${m.poster_url||'https://placehold.co/300x450/2d3748/ffffff?text=Movie'}" onerror="this.src='https://placehold.co/300x450/2d3748/ffffff?text=Movie'"><div class="trash-item-info"><div class="trash-item-title">${m.title} ${m.subtitle||''}</div><div class="trash-item-meta">${m.year||''} • ${m.site_grade||'More'}</div><span class="trash-item-type">Movie</span></div><div class="trash-item-actions"><button class="trash-btn restore" onclick="restoreContentFromTrash('movie', '${m.id}')">↻</button><button class="trash-btn delete" onclick="hardDeleteContentFromTrash('movie', '${m.id}')">✕</button></div></div>`;});all.oscar.forEach(o=>{html+=`<div class="content-trash-modal-item"><img class="trash-item-poster" src="${o.poster_url||'https://placehold.co/300x450/2d3748/ffffff?text=Movie'}"><div class="trash-item-info"><div class="trash-item-title">${o.title}</div><div class="trash-item-meta">${o.release_year||''} • ${o.category}</div><span class="trash-item-type" style="background:rgba(191,149,63,.2);color:#bf953f;">Oscar</span></div><div class="trash-item-actions"><button class="trash-btn restore" onclick="restoreContentFromTrash('oscar_movie', '${o.id}')">↻</button><button class="trash-btn delete" onclick="hardDeleteContentFromTrash('oscar_movie', '${o.id}')">✕</button></div></div>`;});all.header.forEach(h=>{html+=`<div class="content-trash-modal-item"><img class="trash-item-poster" src="${h.media_url||'https://placehold.co/300x450/2d3748/ffffff?text=Image'}"><div class="trash-item-info"><div class="trash-item-title">Header Image</div><div class="trash-item-meta">Square #${h.square_index+1} • Face #${h.face_order+1}</div><span class="trash-item-type" style="background:rgba(16,185,129,.2);color:#34d399;">Header</span></div><div class="trash-item-actions"><button class="trash-btn restore" onclick="restoreContentFromTrash('header_image', '${h.id}')">↻</button><button class="trash-btn delete" onclick="hardDeleteContentFromTrash('header_image', '${h.id}')">✕</button></div></div>`;});all.marquee.forEach(q=>{html+=`<div class="content-trash-modal-item"><img class="trash-item-poster" src="https://placehold.co/300x450/8b5cf6/fff?text=Msg"><div class="trash-item-info"><div class="trash-item-title">${q.text}</div><div class="trash-item-meta">Marquee</div><span class="trash-item-type" style="background:rgba(139,92,246,.2);color:#a78bfa;">Marquee</span></div><div class="trash-item-actions"><button class="trash-btn restore" onclick="restoreContentFromTrash('marquee_text', '${q.id}')">↻</button><button class="trash-btn delete" onclick="hardDeleteContentFromTrash('marquee_text', '${q.id}')">✕</button></div></div>`;});body.innerHTML=html;footer.style.display='block';}
async function restoreContentFromTrash(type,id){const res=await restoreContent(type,id);if(res.success){showToast('✅ Restored','');renderContentTrashModal();if(type==='movie')loadHomepageFromDB();if(type==='oscar_movie'){await loadOscarFromDB();renderOscarModals();}if(type==='header_image'){await loadHeaderMediaFromDB();}if(type==='marquee_text'){await loadMarqueeFromDB();}}else{showToast('❌ Failed',res.error);}}
async function hardDeleteContentFromTrash(type,id){showCustomConfirm('Delete permanently?','Cannot undo.','Yes, Delete',async()=>{const res=await permanentlyDeleteContent(type,id);if(res.success){showToast('🗑️ Deleted','');renderContentTrashModal();}else{showToast('❌ Failed',res.error);}});}
async function emptyContentTrash(){showCustomConfirm('Empty Content Trash?','All will be deleted.','Yes, Empty',async()=>{const all=await getAllTrashedContent();let count=0;for(let m of all.movies){await permanentlyDeleteContent('movie',m.id);count++;}for(let o of all.oscar){await permanentlyDeleteContent('oscar_movie',o.id);count++;}for(let h of all.header){await permanentlyDeleteContent('header_image',h.id);count++;}for(let q of all.marquee){await permanentlyDeleteContent('marquee_text',q.id);count++;}showToast(`🗑️ ${count} deleted`,'');renderContentTrashModal();});}
async function updateContentTrashCount(){if(!isCurrentUserAdmin())return;const all=await getAllTrashedContent();let total=all.movies.length+all.oscar.length+all.header.length+all.marquee.length;document.getElementById('contentTrashCount').textContent=total;document.getElementById('contentTrashModalCount').textContent=total;}
async function softDeleteMarquee(id){if(!isCurrentUserAdmin()){showToast('🔒 Admin only','');return;}const res=await deleteContent('marquee_text',id,{title:'Marquee'});if(res.success){showToast('🗑️ Marquee moved to Trash','');updateContentTrashCount();await loadMarqueeFromDB();}else{showToast('❌ Failed',res.error||'');}}
function openEditMarquee(id){if(!isCurrentUserAdmin()){showToast('🔒 Admin only','');return;}const editBtn=document.querySelector(`.marquee-msg-actions button[onclick*="openEditMarquee('${id}')"]`);const rowDiv=editBtn?editBtn.closest('.marquee-msg-row'):null;const currentText=(rowDiv&&rowDiv.querySelector('p'))?rowDiv.querySelector('p').textContent:'';window._editingMarqueeId=id;document.getElementById('marqueeEditText').value=currentText;document.getElementById('marqueeEditOverlay').classList.add('active');setTimeout(()=>{const ta=document.getElementById('marqueeEditText');if(ta)ta.focus();},100);}
function closeEditMarquee(){document.getElementById('marqueeEditOverlay').classList.remove('active');window._editingMarqueeId=null;}
async function saveEditMarquee(){if(!window._editingMarqueeId)return;if(!isCurrentUserAdmin())return;const newText=document.getElementById('marqueeEditText').value.trim();if(!newText){showToast('⚠️ Text required','');return;}const validSession=await ensureValidSession();if(!validSession){showToast('🔒 Session expired','');return;}try{const{error}=await supabaseClient.from('marquee_messages').update({text:newText}).eq('id',window._editingMarqueeId);if(error)throw error;showToast('✅ Updated','');closeEditMarquee();await loadMarqueeFromDB();DD.style.display='block';CB.style.display='flex';TM('paused');}catch(e){showToast('❌ '+(e.message||'Failed'),'');}}
function openAddMarquee(){if(!isCurrentUserAdmin()){showToast('🔒 Admin only','');return;}document.getElementById('marqueeAddText').value='';document.getElementById('marqueeAddOverlay').classList.add('active');setTimeout(()=>{const ta=document.getElementById('marqueeAddText');if(ta)ta.focus();},100);}
function closeAddMarquee(){document.getElementById('marqueeAddOverlay').classList.remove('active');}
async function saveAddMarquee(){if(!isCurrentUserAdmin())return;const newText=document.getElementById('marqueeAddText').value.trim();if(!newText){showToast('⚠️ Text required','');return;}const validSession=await ensureValidSession();if(!validSession){showToast('🔒 Session expired','');return;}try{const{data:existing}=await supabaseClient.from('marquee_messages').select('display_order').order('display_order',{ascending:false}).limit(1);const maxOrder=(existing&&existing[0]&&existing[0].display_order!=null)?Number(existing[0].display_order):0;const{error}=await supabaseClient.from('marquee_messages').insert([{text:newText,is_active:true,in_trash:false,display_order:maxOrder+1}]);if(error)throw error;showToast('✅ Added','');closeAddMarquee();await loadMarqueeFromDB();DD.style.display='block';CB.style.display='flex';TM('paused');}catch(e){showToast('❌ '+(e.message||'Failed'),'');}}
document.addEventListener('DOMContentLoaded',function(){const overlay=document.getElementById('marqueeEditOverlay');if(overlay)overlay.addEventListener('click',function(e){if(e.target===this)closeEditMarquee();});const overlayAdd=document.getElementById('marqueeAddOverlay');if(overlayAdd)overlayAdd.addEventListener('click',function(e){if(e.target===this)closeAddMarquee();});});
const G=id=>`<svg viewBox="0 0 500 1100" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%"><defs><linearGradient id="gb${id}" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#2a1600"/><stop offset="12%" stop-color="#df9a1b"/><stop offset="25%" stop-color="#ffebb3"/><stop offset="45%" stop-color="#c48a12"/><stop offset="65%" stop-color="#543200"/><stop offset="85%" stop-color="#e3ae2b"/><stop offset="100%" stop-color="#1c0f00"/></linearGradient><linearGradient id="gd${id}" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#4a2c00"/><stop offset="50%" stop-color="#a6740b"/><stop offset="100%" stop-color="#291800"/></linearGradient><linearGradient id="bb${id}" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#000"/><stop offset="20%" stop-color="#333"/><stop offset="40%" stop-color="#0a0a0a"/><stop offset="70%" stop-color="#1f1f1f"/><stop offset="100%" stop-color="#000"/></linearGradient><linearGradient id="gp${id}" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#8c6218"/><stop offset="50%" stop-color="#fceab8"/><stop offset="100%" stop-color="#52361b"/></linearGradient></defs><ellipse cx="250" cy="1000" rx="200" ry="35" fill="#000"/><path d="M 50 960 L 50 1000 C 50 1019,450 1019,450 1000 L 450 960 Z" fill="url(#bb${id})"/><ellipse cx="250" cy="960" rx="200" ry="35" fill="#111"/><path d="M 160 970 L 340 970 L 350 990 L 150 990 Z" fill="url(#gp${id})"/><rect x="180" y="975" width="140" height="2" fill="#52361b" opacity=".6"/><rect x="190" y="980" width="120" height="2" fill="#52361b" opacity=".6"/><rect x="210" y="985" width="80" height="2" fill="#52361b" opacity=".6"/><path d="M 100 810 L 100 930 C 100 950,400 950,400 930 L 400 810 Z" fill="url(#bb${id})"/><ellipse cx="250" cy="930" rx="150" ry="25" fill="#0a0a0a"/><rect x="130" y="810" width="20" height="135" fill="#fff" opacity=".08"/><rect x="330" y="810" width="15" height="130" fill="#fff" opacity=".05"/><path d="M 105 760 L 105 810 C 105 830,395 830,395 810 L 395 760 Z" fill="url(#gb${id})"/><ellipse cx="250" cy="810" rx="145" ry="25" fill="#2a1600" opacity=".5"/><ellipse cx="250" cy="760" rx="145" ry="25" fill="url(#gp${id})"/><path d="M 190 765 C 190 600,160 500,200 350 L 250 350 L 250 765 Z" fill="url(#gb${id})"/><path d="M 310 765 C 310 600,340 500,300 350 L 250 350 L 250 765 Z" fill="url(#gb${id})"/><path d="M 205 500 Q 230 600 215 760" fill="none" stroke="#2a1600" stroke-width="6" opacity=".7"/><path d="M 295 500 Q 270 600 285 760" fill="none" stroke="#2a1600" stroke-width="6" opacity=".7"/><path d="M 250 350 L 250 765" stroke="#1c0f00" stroke-width="8" opacity=".9"/><rect x="242" y="270" width="16" height="490" fill="url(#gb${id})"/><rect x="244" y="270" width="4" height="490" fill="#fff" opacity=".7"/><rect x="220" y="280" width="60" height="12" rx="4" fill="url(#gb${id})"/><path d="M 200 350 C 180 280,160 220,140 180 C 160 140,340 140,360 180 C 340 220,320 280,300 350 Z" fill="url(#gb${id})"/><path d="M 160 180 C 190 220,230 225,250 225 C 270 225,310 220,340 180" fill="none" stroke="#543200" stroke-width="5" opacity=".6"/><path d="M 190 250 Q 220 300 210 350" fill="none" stroke="#543200" stroke-width="4" opacity=".5"/><path d="M 310 250 Q 280 300 290 350" fill="none" stroke="#543200" stroke-width="4" opacity=".5"/><path d="M 140 180 C 120 240,180 290,230 270 C 210 250,170 230,140 180 Z" fill="url(#gb${id})"/><path d="M 360 180 C 380 240,320 290,270 270 C 290 250,330 230,360 180 Z" fill="url(#gb${id})"/><ellipse cx="235" cy="275" rx="15" ry="10" fill="url(#gd${id})" transform="rotate(15 235 275)"/><ellipse cx="265" cy="265" rx="15" ry="10" fill="url(#gb${id})" transform="rotate(-15 265 265)"/><rect x="225" y="100" width="50" height="50" fill="url(#gb${id})"/><path d="M 215 90 C 215 30,225 15,250 15 C 275 15,285 30,285 90 C 285 130,275 140,250 140 C 225 140,215 130,215 90 Z" fill="url(#gb${id})"/><ellipse cx="235" cy="65" rx="10" ry="4" fill="#2a1600" opacity=".8"/><ellipse cx="265" cy="65" rx="10" ry="4" fill="#2a1600" opacity=".8"/><path d="M 250 60 L 250 100" stroke="#1c0f00" stroke-width="5" opacity=".6"/><path d="M 248 60 L 248 100" stroke="#ffebb3" stroke-width="2" opacity=".7"/><path d="M 238 110 L 262 110" stroke="#1c0f00" stroke-width="4" opacity=".7"/><path d="M 220 80 Q 250 115 250 135" fill="none" stroke="#543200" stroke-width="3" opacity=".5"/><path d="M 280 80 Q 250 115 250 135" fill="none" stroke="#543200" stroke-width="3" opacity=".5"/><path d="M 225 70 C 225 35,235 25,250 20" fill="none" stroke="#fff" stroke-width="6" opacity=".3"/></svg>`;
async function compressImage(file, maxWidth, maxHeight, quality){
    maxWidth = maxWidth || 900;
    maxHeight = maxHeight || 1350;
    quality = quality || 0.82;
    return new Promise(function(resolve, reject){
        var reader = new FileReader();
        reader.onload = function(e){
            var img = new Image();
            img.onload = function(){
                var w = img.width, h = img.height;
                if(w > maxWidth || h > maxHeight){
                    var ratio = Math.min(maxWidth/w, maxHeight/h);
                    w = Math.round(w * ratio);
                    h = Math.round(h * ratio);
                }
                var canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                var ctx = canvas.getContext('2d');
                if(ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = 'high';
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0, w, h);
                canvas.toBlob(function(blob){
                    if(!blob){ reject(new Error('Compression failed')); return; }
                    var newName = (file.name || 'image').replace(/\.[^.]+$/, '') + '.jpg';
                    var newFile = new File([blob], newName, { type: 'image/jpeg' });
                    resolve(newFile);
                }, 'image/jpeg', quality);
            };
            img.onerror = function(){ reject(new Error('Image load failed')); };
            img.src = e.target.result;
        };
        reader.onerror = function(){ reject(new Error('File read failed')); };
        reader.readAsDataURL(file);
    });
}
async function uploadImageToStorage(file,folder){
    folder = folder || 'posters';
    if(!file) throw new Error('No file');
    if(file.size > 15*1024*1024) throw new Error('الصورة أكبر من 15MB');
    var ext = (file.name || '').split('.').pop().toLowerCase();
    if(['jpg','jpeg','png','webp','gif'].indexOf(ext) === -1) throw new Error('فقط JPG / PNG / WebP / GIF');
    var finalFile = file;
    var finalExt = 'jpg';
    var contentType = 'image/jpeg';
    if(ext === 'gif'){
        finalFile = file;
        finalExt = 'gif';
        contentType = 'image/gif';
    } else {
        try{
            finalFile = await compressImage(file, 900, 1350, 0.82);
        }catch(err){
            console.warn('Compression failed, uploading original:', err);
            finalFile = file;
            finalExt = ext;
            contentType = file.type || ('image/' + (ext === 'jpg' ? 'jpeg' : ext));
        }
    }
    var fileName = folder + '/' + Date.now() + '_' + Math.random().toString(36).slice(2) + '.' + finalExt;
    var upRes = await supabaseClient.storage.from('tomo-images').upload(fileName, finalFile, {
        cacheControl: '31536000',
        upsert: false,
        contentType: contentType
    });
    if(upRes.error) throw upRes.error;
    var pubRes = supabaseClient.storage.from('tomo-images').getPublicUrl(fileName);
    return pubRes.data.publicUrl;
}
function triggerPosterUpload(targetInputId){
    const inp=document.createElement('input');
    inp.type='file';
    inp.accept='image/*';
    inp.onchange=async(e)=>{
        const file=e.target.files[0];
        if(!file) return;
        showToast('⏳ جاري الرفع...','قد يأخذ لحظات');
        try{
            const url=await uploadImageToStorage(file,'posters');
            document.getElementById(targetInputId).value=url;
            showToast('✅ تم الرفع','الصورة جاهزة');
        }catch(err){
            showToast('❌ فشل الرفع',err.message||'');
        }
    };
    inp.click();
}
function getTmdbKey(){return localStorage.getItem('tmdb_api_key')||'';}
function setTmdbKey(key){localStorage.setItem('tmdb_api_key',key);}
async function tmdbSearchAndFill(){
    let key=getTmdbKey();
    if(!key){
        key=prompt('أدخل مفتاح TMDB API\n(احصل عليه مجاناً من themoviedb.org)');
        if(!key) return;
        setTmdbKey(key);
    }
    const query=prompt('اسم الفيلم بالإنجليزية:');
    if(!query) return;
    showToast('🔍 جاري البحث...','');
    try{
        const res=await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(query)}&language=en-US&page=1`);
        const data=await res.json();
        if(data.status_code) throw new Error(data.status_message||'Invalid API key');
        if(!data.results||data.results.length===0){showToast('❌ لا نتائج','جرب اسماً آخر');return;}
        const movie=data.results[0];
        const year=movie.release_date?movie.release_date.split('-')[0]:'';
        const fullTitle=movie.title||'';
        const words=fullTitle.split(' ');
        const firstWord=words[0]||fullTitle;
        const rest=words.slice(1).join(' ');
        const poster=movie.poster_path?`https://image.tmdb.org/t/p/w500${movie.poster_path}`:'';
        document.getElementById('admMovieTitle').value=firstWord;
        document.getElementById('admMovieSubtitle').value=rest;
        document.getElementById('admMovieYear').value=year;
        document.getElementById('admMoviePoster').value=poster;
        try{
            const detRes=await fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${key}&language=en-US`);
            const det=await detRes.json();
            if(det.genres) document.getElementById('admMovieGenre').value=det.genres.map(g=>g.name).join(', ');
        }catch(e){}
        showToast('✅ تم الملء',fullTitle+' ('+year+')');
    }catch(e){
        showToast('❌ فشل البحث',e.message||'');
    }
}
async function tmdbSetupKey(){
    const currentKey=getTmdbKey();
    const newKey=prompt('مفتاح TMDB API\n\n(احصل عليه من themoviedb.org)',currentKey||'');
    if(newKey!==null){
        setTmdbKey(newKey);
        showToast('✅ تم الحفظ',newKey?'جاهز':'تم الحذف');
    }
}
async function tmdbSearchAndFillOscar(){
    let key=getTmdbKey();
    if(!key){
        key=prompt('أدخل مفتاح TMDB API\n(احصل عليه مجاناً من themoviedb.org)');
        if(!key) return;
        setTmdbKey(key);
    }
    const query=prompt('اسم الفيلم بالإنجليزية:');
    if(!query) return;
    showToast('🔍 جاري البحث...','');
    try{
        const res=await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(query)}&language=en-US&page=1`);
        const data=await res.json();
        if(data.status_code) throw new Error(data.status_message||'Invalid API key');
        if(!data.results||data.results.length===0){showToast('❌ لا نتائج','جرب اسماً آخر');return;}
        const movie=data.results[0];
        const year=movie.release_date?movie.release_date.split('-')[0]:'';
        const poster=movie.poster_path?`https://image.tmdb.org/t/p/w500${movie.poster_path}`:'';
        document.getElementById('admOscarTitle').value=movie.title||'';
        document.getElementById('admOscarReleaseYear').value=year;
        document.getElementById('admOscarPoster').value=poster;
        try{
            const detRes=await fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${key}&language=en-US`);
            const det=await detRes.json();
            if(det.genres) document.getElementById('admOscarGenre').value=det.genres.map(g=>g.name).join(', ');
        }catch(e){}
        showToast('✅ تم الملء',(movie.title||'')+' ('+year+')');
    }catch(e){
        showToast('❌ فشل البحث',e.message||'');
    }
}
let _tmdbPersonData=null;
async function tmdbSearchPersonForHeader(){
    let key=getTmdbKey();
    if(!key){
        key=prompt('أدخل مفتاح TMDB API\n(احصل عليه مجاناً من themoviedb.org)');
        if(!key) return;
        setTmdbKey(key);
    }
    const query=prompt('اسم الممثل بالإنجليزية:');
    if(!query) return;
    showToast('🔍 جاري البحث...','');
    try{
        const res=await fetch(`https://api.themoviedb.org/3/search/person?api_key=${key}&query=${encodeURIComponent(query)}&language=en-US&page=1`);
        const data=await res.json();
        if(data.status_code) throw new Error(data.status_message||'Invalid API key');
        if(!data.results||data.results.length===0){showToast('❌ لا نتائج','جرب اسماً آخر');return;}
        const person=data.results[0];
        if(!person.profile_path){showToast('❌ لا صورة','هذا الممثل ليس لديه صورة');return;}
        _tmdbPersonData={
            name:person.name,
            imgUrl:`https://image.tmdb.org/t/p/h632${person.profile_path}`
        };
        document.getElementById('tmdbPersonImg').src=_tmdbPersonData.imgUrl;
        document.getElementById('tmdbPersonName').textContent=person.name;
        document.getElementById('tmdbSquareInput').value='';
        document.getElementById('tmdbFaceInput').value='';
        document.getElementById('tmdbPersonModalOverlay').classList.add('active');
        document.getElementById('tmdbSquareInput').focus();
    }catch(e){
        showToast('❌ فشل البحث',e.message||'');
    }
}
function closeTmdbPersonModal(){
    document.getElementById('tmdbPersonModalOverlay').classList.remove('active');
    _tmdbPersonData=null;
}
async function applyTmdbPersonToHeader(){
    if(!_tmdbPersonData) return;
    const squareVal=parseInt(document.getElementById('tmdbSquareInput').value);
    if(isNaN(squareVal)||squareVal<1||squareVal>168){
        showToast('⚠️ رقم مربع غير صالح','يجب أن يكون بين 1 و 168');
        return;
    }
    const faceInput=document.getElementById('tmdbFaceInput').value.trim();
    let faceVal=1;
    if(faceInput!==''){
        faceVal=parseInt(faceInput);
        if(isNaN(faceVal)||faceVal<1||faceVal>12){
            showToast('⚠️ رقم وجه غير صالح','استخدام الوجه الأول افتراضياً');
            faceVal=1;
        }
    }
    const squareIdx=squareVal-1;
    const faceOrder=faceVal-1;
    showToast('⏳ جاري تحميل الصورة ورفعها...','');
    try{
        const imgRes=await fetch(_tmdbPersonData.imgUrl);
        if(!imgRes.ok) throw new Error('Failed to fetch image');
        const blob=await imgRes.blob();
        const fileName=`header/tmdb_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        const upRes=await supabaseClient.storage.from('tomo-images').upload(fileName,blob,{
            cacheControl:'31536000',
            upsert:false,
            contentType:blob.type||'image/jpeg'
        });
        if(upRes.error) throw upRes.error;
        const pubRes=supabaseClient.storage.from('tomo-images').getPublicUrl(fileName);
        const finalUrl=pubRes.data.publicUrl;
        const lookup=await supabaseClient.from('header_media')
            .select('id')
            .eq('square_index',squareIdx)
            .eq('face_order',faceOrder)
            .limit(1);
        const targetId=(lookup.data&&lookup.data[0])?lookup.data[0].id:'';
        if(targetId){
            const updRes=await supabaseClient.from('header_media')
                .update({media_url:finalUrl,media_type:'image',in_trash:false})
                .eq('id',targetId);
            if(updRes.error) throw updRes.error;
        } else {
            const insRes=await supabaseClient.from('header_media')
                .insert([{media_type:'image',media_url:finalUrl,square_index:squareIdx,face_order:faceOrder,is_active:true,in_trash:false}]);
            if(insRes.error) throw insRes.error;
        }
        showToast('✅ تم التطبيق',`${_tmdbPersonData.name} → المربع ${squareVal} الوجه ${faceVal}`);
        closeTmdbPersonModal();
        await loadHeaderMediaFromDB();
        renderHeaderImagesManager();
    }catch(e){
        showToast('❌ فشل',e.message||'');
    }
}
async function renderHeaderImagesManager(){
    const container=document.getElementById('adminHeaderImagesList');
    container.innerHTML='<div style="text-align:center;padding:20px;color:#9ca3af;">⏳ جاري التحميل...</div>';
    try{
        const{data,error}=await supabaseClient.from('header_media').select('*').order('square_index').order('face_order');
        if(error) throw error;
        let html='<div class="header-images-grid">';
        for(let sq=0;sq<14;sq++){
            for(let face=0;face<12;face++){
                const item=(data||[]).find(d=>d.square_index===sq&&d.face_order===face&&!d.in_trash);
                const imgUrl=item?item.media_url:'';
                const dbId=item?item.id:'';
                html+=`<div class="header-img-cell">
                    ${imgUrl?`<img src="${imgUrl}" onerror="this.style.display='none'">`:'<div class="empty-label">فارغ</div>'}
                    <div class="cell-num">#${sq+1}-${face+1}</div>
                    <div class="cell-actions">
                        <button class="upload-cell-btn" onclick="uploadHeaderImage(${sq},${face},'${dbId}')" title="رفع">📤</button>
                        ${dbId?`<button class="del-cell-btn" onclick="deleteHeaderImageAdmin('${dbId}')" title="حذف">✕</button>`:''}
                    </div>
                </div>`;
            }
        }
        html+='</div>';
        container.innerHTML=html;
    }catch(e){
        container.innerHTML='<div style="text-align:center;padding:20px;color:#ef4444;">❌ '+escapeHtml(e.message)+'</div>';
    }
}
async function uploadHeaderImage(squareIdx,faceOrder,existingId){
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.onchange = async function(e){
        var file = e.target.files[0];
        if(!file) return;
        showToast('⏳ جاري الرفع...','قد يأخذ لحظات');
        try{
            var url = await uploadImageToStorage(file, 'header');
            var targetId = existingId || '';
            if(!targetId){
                var lookup = await supabaseClient.from('header_media')
                    .select('id')
                    .eq('square_index', squareIdx)
                    .eq('face_order', faceOrder)
                    .limit(1);
                if(lookup.data && lookup.data[0]) targetId = lookup.data[0].id;
            }
            if(targetId){
                var updRes = await supabaseClient.from('header_media')
                    .update({ media_url: url, media_type: 'image', in_trash: false })
                    .eq('id', targetId);
                if(updRes.error) throw updRes.error;
            } else {
                var insRes = await supabaseClient.from('header_media')
                    .insert([{ media_type: 'image', media_url: url, square_index: squareIdx, face_order: faceOrder, is_active: true, in_trash: false }]);
                if(insRes.error) throw insRes.error;
            }
            showToast('✅ تم الرفع','');
            await loadHeaderMediaFromDB();
            renderHeaderImagesManager();
        }catch(err){
            showToast('❌ فشل الرفع', err.message || '');
        }
    };
    inp.click();
}
async function deleteHeaderImageAdmin(id){
    showCustomConfirm('حذف هذه الصورة؟','ستنتقل إلى Content Trash.','نعم، احذف',async()=>{
        const res=await deleteContent('header_image',id,{title:'Header Image'});
        if(res.success){
            showToast('🗑️ حُذفت','');
            await loadHeaderMediaFromDB();
            renderHeaderImagesManager();
            updateContentTrashCount();
        }else{
            showToast('❌ فشل الحذف',res.error);
        }
    });
}
function openEditMovieModal(movieId){
    const movie=movieDB.find(m=>m.id===movieId);
    if(!movie){showToast('❌ Movie not found','');return;}
    window._editingMovieId=movieId;
    document.getElementById('editMovieTitle').value=movie.title||'';
    document.getElementById('editMovieSubtitle').value=movie.subtitle||'';
    document.getElementById('editMovieYear').value=movie.year||'';
    document.getElementById('editMovieGenre').value=movie.genre||'';
    document.getElementById('editMoviePoster').value=movie.poster||'';
    document.getElementById('editMovieOverlay').classList.add('active');
}
function closeEditMovie(){document.getElementById('editMovieOverlay').classList.remove('active');window._editingMovieId=null;}
async function saveEditMovie(){
    if(!window._editingMovieId) return;
    const title=document.getElementById('editMovieTitle').value.trim();
    if(!title){showToast('⚠️ Title required','');return;}
    const updates={title:title,subtitle:document.getElementById('editMovieSubtitle').value.trim(),year:document.getElementById('editMovieYear').value.trim()||null,genre:document.getElementById('editMovieGenre').value.trim(),poster_url:document.getElementById('editMoviePoster').value.trim()};
    try{
        const{error}=await supabaseClient.from('movies').update(updates).eq('id',window._editingMovieId);
        if(error) throw error;
        showToast('✅ Updated','');
        closeEditMovie();
        await loadHomepageFromDB();
        renderAdminMoviesList();
    }catch(e){showToast('❌ Failed',e.message||'');}
}
function toggleAdminMovieSelect(movieId,checkbox){
    if(checkbox.checked){window._adminSelectedMovies.add(movieId);}else{window._adminSelectedMovies.delete(movieId);}
    updateBulkBar();
}
function updateBulkBar(){
    const bar=document.getElementById('bulkBar');
    const count=document.getElementById('bulkCount');
    const n=window._adminSelectedMovies.size;
    if(n>0){bar.classList.remove('hidden');count.textContent=n+' محدد';}else{bar.classList.add('hidden');}
}
async function bulkDeleteMovies(){
    const ids=Array.from(window._adminSelectedMovies);
    if(ids.length===0){showToast('⚠️ لم تختر','');return;}
    showCustomConfirm(`حذف ${ids.length} فيلم؟`,'ستنتقل إلى Content Trash.','نعم',async()=>{
        let success=0;
        for(const id of ids){
            const res=await deleteContent('movie',id,{title:'Bulk'});
            if(res.success) success++;
        }
        window._adminSelectedMovies.clear();
        showToast(`🗑️ ${success} نُقل إلى Trash`,'');
        await loadHomepageFromDB();
        renderAdminMoviesList();
        updateContentTrashCount();
    });
}
async function bulkMoveMovies(){
    const ids=Array.from(window._adminSelectedMovies);
    if(ids.length===0){showToast('⚠️ لم تختر','');return;}
    const newGrade=document.getElementById('bulkMoveGrade').value;
    if(!newGrade){showToast('⚠️ اختر القسم','');return;}
    showCustomConfirm(`نقل ${ids.length} فيلم إلى ${newGrade}؟`,'','نعم',async()=>{
        let success=0;
        for(const id of ids){
            try{const{error}=await supabaseClient.from('movies').update({site_grade:newGrade}).eq('id',id);if(!error)success++;}catch(e){}
        }
        window._adminSelectedMovies.clear();
        showToast(`✅ ${success} نُقل إلى ${newGrade}`,'');
        await loadHomepageFromDB();
        renderAdminMoviesList();
    });
}
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
