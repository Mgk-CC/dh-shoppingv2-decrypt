function ToHex(input)
{
	var ret= "";
	for (var i=0;i<input.length;i++)
	{	
		ret  = ret + (((parseInt(input[i],10)>>>0) & 0xff).toString(16)) + " ";

	}
	return ret;
}

function stringToByte(str) {  
    var bytes = new Array();  
    var len, c;  
    len = str.length;  
    for(var i = 0; i < len; i++) {  
        c = str.charCodeAt(i);  
        if(c >= 0x010000 && c <= 0x10FFFF) {  
            bytes.push(((c >> 18) & 0x07) | 0xF0);  
            bytes.push(((c >> 12) & 0x3F) | 0x80);  
            bytes.push(((c >> 6) & 0x3F) | 0x80);  
            bytes.push((c & 0x3F) | 0x80);  
        } else if(c >= 0x000800 && c <= 0x00FFFF) {  
            bytes.push(((c >> 12) & 0x0F) | 0xE0);  
            bytes.push(((c >> 6) & 0x3F) | 0x80);  
            bytes.push((c & 0x3F) | 0x80);  
        } else if(c >= 0x000080 && c <= 0x0007FF) {  
            bytes.push(((c >> 6) & 0x1F) | 0xC0);  
            bytes.push((c & 0x3F) | 0x80);  
        } else {  
            bytes.push(c & 0xFF);  
        }  
    }  
    return bytes;  


}  

function byteToString(arr) {
    if(typeof arr === 'string') {  
        return arr;  
    }  
    var str = '',  
        _arr = arr;  
    for(var i = 0; i < _arr.length; i++) { 
        var one = (_arr[i] & 0xff).toString(2),  
            v = one.match(/^1+?(?=0)/);  
        if(v && one.length == 8) {  
            var bytesLength = v[0].length;  
            var store = (_arr[i] & 0xff).toString(2).slice(7 - bytesLength);  
            for(var st = 1; st < bytesLength; st++) {  
                store += (_arr[st + i] & 0xff).toString(2).slice(2);  
            }  
            str += String.fromCharCode(parseInt(store, 2));  
            i += bytesLength - 1;  
        } else {  
            str += String.fromCharCode(_arr[i]);  
        }  
    }  
    return str;  
}  

function arrayBufferToBase64( buffer ) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return btoa( binary );
}

function base64ToArrayBuffer(base64) {
    var binary_string =  atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array( len );
    for (var i = 0; i < len; i++)        {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
}





function wbsk_AES_ecb_encrypt_base64(input){
	var tmp_input = stringToByte(input);
	var result = wbsk_AES_ecb_encrypt(tmp_input, tmp_input.length);
	return arrayBufferToBase64(result);
}

function wbsk_AES_ecb_encrypt(input, inlen)
{	
	var tt = [];

	var len = (Math.floor(inlen/16)+1)*16;

	var outadd = Module._malloc(len);
    var output = Module.HEAP8.subarray(outadd, outadd + len);
	
	var lenadd = Module._malloc(4);
    var lenput = Module.HEAP32.subarray(lenadd/4, lenadd/4 + 1);
    lenput[0] = len;
	

	var ECBEncrypt = Module.cwrap('wbsk_AES_ecb_encrypt', 'number', ['array','number','number','number'])
	var r = ECBEncrypt(new Uint8Array(input), inlen, outadd, lenadd);
	var olen = lenput[0];

	for(var key in output)
	{
		tt.push(output[key]);
	}

	Module._free(outadd);
	Module._free(lenadd);
	
	return (tt.slice(0,olen));
	
}







function wbsk_AES_ecb_decrypt_base64(input){
	var tmp_input = base64ToArrayBuffer(input)
	var result =  wbsk_AES_ecb_decrypt(tmp_input, tmp_input.length);
    return byteToString(result);
}

function wbsk_AES_ecb_decrypt(input, inlen)
{
	var tt=[];

	var len = inlen;
	var outadd = Module._malloc(len);
    var output = Module.HEAP8.subarray(outadd, outadd + len);
	
	var lenadd = Module._malloc(4);
    var lenput = Module.HEAP32.subarray(lenadd/4, lenadd/4 + 1);
	lenput[0] = len;
	

	var ECBDecrypt = Module.cwrap('wbsk_AES_ecb_decrypt', 'number', ['array','number','number','number'])
	var r = ECBDecrypt(new Uint8Array(input), inlen, outadd, lenadd);
	var olen = lenput[0];

	for(var key in output)
	{
		tt.push(output[key]);
	}
	
	Module._free(outadd);
	Module._free(lenadd);
	
	return (tt.slice(0,olen));
	
}





	
function wbsk_AES_cbc_encrypt_base64(input, iv){
	var tmp_input = stringToByte(input);
	var result = wbsk_AES_cbc_encrypt(tmp_input, tmp_input.length, iv, iv.length);
	return arrayBufferToBase64(result);
}

function wbsk_AES_cbc_encrypt(input, inlen, iv, ivlen)
{
	var tt=[];

	var len = (Math.floor(inlen/16)+1)*16;
	var outadd = Module._malloc(len);
    var output = Module.HEAP8.subarray(outadd, outadd + len);
	
	var lenadd = Module._malloc(4);
    var lenput = Module.HEAP32.subarray(lenadd/4, lenadd/4 + 1);
    lenput[0] = len;
	

	var CBCEncrypt = Module.cwrap('wbsk_AES_cbc_encrypt', 'number', ['array','number','number','number','array','number'])
	var r = CBCEncrypt(new Uint8Array(input), inlen, outadd, lenadd, new Uint8Array(iv), ivlen);
	var olen = lenput[0];

	for(var key in output)
	{
		tt.push(output[key]);
	}
	
	Module._free(outadd);
	Module._free(lenadd);
	
	return (tt.slice(0,olen));
	
}







function wbsk_AES_cbc_decrypt_base64(input, iv){
	var tmp_input = base64ToArrayBuffer(input)
	var result =  wbsk_AES_cbc_decrypt(tmp_input, tmp_input.length,iv, iv.length);
    return byteToString(result);
}

function wbsk_AES_cbc_decrypt(input, inlen, iv, ivlen)
{
	var tt=[];

	var len = inlen;
	var outadd = Module._malloc(len);
    var output = Module.HEAP8.subarray(outadd, outadd + len);
	
	var lenadd = Module._malloc(4);
    var lenput = Module.HEAP32.subarray(lenadd/4, lenadd/4 + 1);
    lenput[0] = len;
	

	var CBCDecrypt = Module.cwrap('wbsk_AES_cbc_decrypt', 'number', ['array','number','number','number','array','number'])
	var r = CBCDecrypt(new Uint8Array(input), inlen, outadd, lenadd, new Uint8Array(iv), ivlen);
	var olen = lenput[0];

	for(var key in output)
	{
		tt.push(output[key]);
	}
	
	Module._free(outadd);
	Module._free(lenadd);
    
	return (tt.slice(0,olen));
	
}




 
 String.prototype.StrCut2Arr=function(n){
	var str=this;
	var arr=[];
	var len=Math.ceil(str.length/n);
	for(var i=0;i < len;i++){
		if(str.length>=n){
			var strCut=str.substring(0,n);
			arr.push(strCut);
			str=str.substring(n);
		}else{
			str=str;
			arr.push(str);
		}
	}
	return arr;
}
