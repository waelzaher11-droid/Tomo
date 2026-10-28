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
