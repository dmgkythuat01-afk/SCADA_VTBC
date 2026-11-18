/* Stock edits and EpMangIn exports are serialized by the same API project's lock. */
function saveViStockLocations_(idLapVi,items){
  const properties=PropertiesService.getScriptProperties(),url=properties.getProperty('VTBC_STOCK_API_URL'),token=properties.getProperty('VTBC_STOCK_API_TOKEN');
  if(!url||!token)throw Error('Chưa cấu hình API đồng bộ tồn vỉ.');
  const response=UrlFetchApp.fetch(url+'?action=updateViStockLocations&token='+encodeURIComponent(token),{method:'post',contentType:'application/json',payload:JSON.stringify({IdLapVi:idLapVi,items}),muteHttpExceptions:true});
  let result;try{result=JSON.parse(response.getContentText());}catch{throw Error('Không đọc được phản hồi API tồn vỉ. Vui lòng thử lại.');}
  if(response.getResponseCode()!==200||!result.success)throw Error(result.message||'Không cập nhật được tồn vỉ.');return result;
}
/* Run once in the Apps Script editor to authorize the new external-request scope. */
function kiemTraKetNoiTonVi(){
  try{saveViStockLocations_('__NO_SUCH_PLAN__',[]);}catch(error){
    if(String(error.message).includes('Thiếu kế hoạch')){console.log('Kết nối API tồn vỉ thành công. Không thay đổi tồn kho.');return {success:true};}
    throw error;
  }
  throw Error('API chưa từ chối yêu cầu kiểm tra không hợp lệ.');
}
