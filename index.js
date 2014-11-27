/**
 * 使用命令
 *  node index [learn_uuid] [clear] [path]
 *
 */

var cheerio = require('cheerio'),
	fs = require('fs'),
    pathMode = require('path'),
    ng = require('nodegrass'),
    http = require('http');


var arguments = process.argv.splice(2);
if( arguments.length < 1 ){
    throw new Error('至少需要一个参数');
}

var rootPath = process.cwd(),
    learnUrl = 'http://www.imooc.com/learn/',
    interfaceUrl = 'http://www.imooc.com/course/ajaxmediainfo/';
    learn_uuid = arguments[0],
    clear = arguments[1] || 'L', // ["H", "M", "L"]
    path = pathMode.normalize( arguments[2] || rootPath + '/download' );
    

    downloadPath = function( list, clear){
        var rex = new RegExp(clear + "\.\w{3}$"),
            path_ = list[list.length-1];
        list.forEach(function(v, i){
            if( rex.test(v) ){
                path_ =  v;
            }
        });
        return path_;
    };

   if( !fs.existsSync(path) ){
        fs.mkdirSync(path);
   }

    ng.get(learnUrl + learn_uuid, function (data) {
        var $ = cheerio.load(data),
            title = $('h1').text().replace(/^\s+|\s+$/g, ''),
            studyvideos = $('.studyvideo'),
            mid = [],
            download = [],
            index = 0, 
            len = studyvideos.length,
            learnPath = path + '/' + title;

           if( !fs.existsSync(learnPath) ){
                fs.mkdirSync(learnPath);
           }

            studyvideos.each(function(){
                mid.push({
                    id : $(this).attr('href').replace(/\D/g, ''),
                    name : $(this).text().replace(/^\s+|\s+$/g, '')
                });    
            });

            len = mid.length;

            (function(){
                var arg = arguments;
                if( index < len ){
                    ng.get(interfaceUrl + '?mid=' + mid[index].id, function (data) {
                        var json;
                        try{
                            json = JSON.parse(data);
                        }catch(e){}
                        if( json ) {
                            if( json.result == 0){
                                download.push({
                                    url : downloadPath(json.data.result.mpath, clear),
                                    name : mid[index].name.replace(/\(.*\)/g, '')
                                });
                            }
                        }

                        index++;
                        arg.callee();  
                    });
                    

                } else {
                    var index2 = 0, 
                        len2 = download.length;

                        (function(){
                            var arg2 = arguments;
                            if( index2 < len2 ) {
                                
                                var downloadUrl = download[index2].url,
                                    extRex = /\.\w{3}$/,
                                    ext = downloadUrl.match( extRex )[0],
                                    filepath = learnPath + '/' + download[index2].name + ext;


                                    if( !fs.existsSync(filepath) ){
                                        console.log(downloadUrl);
                                        http.get(downloadUrl, function(res){
                                            var fileData = "";

                                            res.setEncoding("binary"); 

                                            console.log("正在下载第" + (index2+1) + '个视频，一共有' + len2 + '个视频~~');

                                            try{
                                                res.on("data", function(chunk){
                                                    fileData += chunk;
                                                });

                                                res.on("end", function(){
                                                    console.log(learnPath + '/' + download[index2].name + ext);
                                                    fs.writeFile(learnPath + '/' + download[index2].name + ext, fileData, "binary", function(err){
                                                        if(err){
                                                            console.log("第" + (index2+1) + '个视频下载失败~~');
                                                        } else {
                                                            console.log("第" + (index2+1) + '个视频下载成功~~');
                                                        }
                                                        
                                                        index2++;
                                                        arg2.callee();
                                                    });
                                                });
                                            }catch(e){};
                                            
                                            res.on("error", function(){
                                                index2++;
                                                arg2.callee();
                                            });

                                        });
                                    } else {
                                        index2++;
                                        arg2.callee();
                                    }
                                
                            } else {
                                console.log('下载完成~~');
                            }
                        }());

                    
                }

            }());

    });


