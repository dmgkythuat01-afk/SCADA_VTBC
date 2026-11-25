/* Server-only API credentials. Never expose these properties to the browser. */
function callEpPlanApi_(action,body) {
  const properties=PropertiesService.getScriptProperties(),url=properties.getProperty('VTBC_STOCK_API_URL'),token=properties.getProperty('VTBC_STOCK_API_TOKEN');
  if(!url||!token)throw Error('Chưa cấu hình API kế hoạch ép màng in.');
  const response=UrlFetchApp.fetch(url+'?action='+encodeURIComponent(action)+'&token='+encodeURIComponent(token),{method:'post',contentType:'application/json',payload:JSON.stringify(body),muteHttpExceptions:true});
  let result;try{result=JSON.parse(response.getContentText());}catch(error){throw Error('Không đọc được phản hồi API ép màng in. Vui lòng thử lại.');}
  if(response.getResponseCode()!==200||!result.success)throw Error(result.message||'Không lưu được kế hoạch ép màng in.');return result;
}
function kiemTraKetNoiKeHoachEpMangIn() {
  const result=callEpPlanApi_('epPlanPing',{});console.log('Kết nối API ép màng in thành công. Không thay đổi tồn kho.');return result;
}
