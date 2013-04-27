pjax
====

一个基于arale的pjax的增强版.使用前请引入<a href="http://aralejs.org" >Arale</a>.

## 改进功能点

* 重新约定了在pjax的条件下后端返回的数据格式,如果需要定制返回数据的解析引擎，可以通过配置属性parseEngine来定制。

    {
        title:'',
        html:'',
        module:'',
        config:{}
    }

    
* 更改了pjax的实现方式，不再只是针对一个容器进行内容的修改，而是多个容器，页面会缓存加载过的内容
* 添加动画效果，可以通过复写transition来更改页面切换效果
* 添加在不支持pushState下的hash bang的支持，用于兼容旧式浏览器

## 使用方式

    seajs.use('pjax',function(Pjax){
        new Pjax({
            container:'#container',
            parseEngine:function(response){
                //parse response that you wanted
                return {
                    html:'',
                    title:'',
                    module:'',
                    config:''
                }
            }
        });
    });
