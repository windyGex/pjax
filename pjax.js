define(function (require, exports, module) {

	var $ = require('$'),
	Base = require('base');

	$.extend($.support, {
		hashchange : 'onhashchange' in window,
		pushState : (window.history && window.history.pushState && window.history.replaceState)
	});

	var hash = function (hash) {
		if (!hash) {
			return location.hash.substring(2);
		} else {
			location.hash = '!' + hash;
		}
	}

	var IframeHistory = Base.extend({
			initialize : function () {
				this.lastHash = this.hash();
				this.create(this.lastHash);
				setInterval($.proxy(this.poll, this), 100);
			},
			create : function (hash) {
				if (this.iframe) {
					return;
				}
				var iframe = '<iframe id="history-iframe" src="'
					 + 'javascript:(function(){document.open();'
					 + 'document.write(\'<html><head>'
					 + (document.domain ? ('<scr' + 'ipt>document.domain = \\\'' + document.domain + '\\\';'
							 + '</scr' + 'ipt>') : '')
					 + '<title>'
					 + document.title
					 + '</title></head><body>'
					 + hash
					 + '</body></html>\');'
					 + 'document.close();})();"></iframe>';

				this.iframe = $(iframe).hide().appendTo(document.body);
				this.iframe = this.iframe[0];
				this.contentDoc = this.iframe.contentWindow.document;
				//iframe的hash
				this.lastIframeHash = hash;
			},
			update : function (hash) {
				var doc = this.contentDoc,
				html = '<html><head>'
					 + (document.domain
						 ? ('<script>document.domain = \'' + document.domain + '\';</script>')
						 : '') + '<title>' + document.title + '</title></head><body>' + hash
					 + '</body></html>';
				doc.open('text/html', 'replace');
				doc.write(html);
				doc.close();

				return true;
			},
			getIframeHash : function () {
				return $(this.contentDoc.body).text();
			},
			hash : function (hash) {
				return hash(hash);
			},
			poll : function () {
				var hash = this.hash(),
				iframeHash = this.getIframeHash();
				//back or forward cause;
				if (iframeHash != this.lastIframeHash) {
					//forward and back cause
					this.hash(iframeHash);
					this.lastIframeHash = iframeHash;
					this.lastHash = iframeHash;
					//this.trigger('change', iframeHash);
				} else if (hash != this.lastHash) { //application cause
					//更新iframe的hash
					if (iframeHash != hash) {
						//产生历史记录
						this.update(hash);
					}
					//设置hash值
					this.lastHash = hash;
					this.trigger('change', hash);
				}

			}
		});

	var HashChangeHistory = Base.extend({
			initialize : function () {
				$(window).on('hashchange', $.proxy(this.hashchange, this));
			},
			hashchange : function () {
				this.trigger('change', hash());
			}
		});

	var History = Base.extend({
			initialize : function () {
				var self = this;
				if ($.support.hashchange) {
					this.history = new HashChangeHistory();
				} else {
					this.history = new IframeHistory();
				}
				return this.history;
			}
		});

	var Pjax = Base.extend({
			attrs : {
				
				// 内容放置的区域
				 
				container : {
					value : '',
					getter : function (val) {
						return $(val);
					}
				},
				// 更改标题的类型
				title : {
					value : 'title',
					getter : function (val) {
						return document.getElementsByTagName(val)[0];
					}
				},
				trigger : 'a',
				//animationType : 'pop',
				timeout : 50000,
				//pjax解析引擎
				parseEngine : function (response) {
					return response;
				}
			},
			initialize : function (config) {
				this._regions = {};
				this.initAttrs(config);
				if ($.support.pushState) {
					this.history = $(window);
				} else {
					this.history = new History();
				}
				this._initEvents();
				this.bindUI();
			},
			_initEvents : function () {
				var self = this;
				this.on('page:fetch', function () {})
				this.on('page:load', function () {})
				this.on('page:change', function () {})
				if ($.support.pushState) {
					var initialURL = location.href;
					this.history.on('popstate', function (e) {
						if (location.href === initialURL) {
							return;
						}
						var url = self.integrateURL(document.location.href);
						self.navigate(url);
						self._changedURL = true;
					});
				} else {
					this.history.on('change', function (hash) {
						self.navigate(hash);
					});
				}
			},
			bindUI : function () {
				$(document).delegate(this.get('trigger'), 'click', $.proxy(this._handle, this));
			},
			_handle : function (e) {
				var target = $(e.target),
				href = target.attr('href');
				e.preventDefault();
				if (href) {
					href = this.integrateURL(href);
					if ($.support.pushState) {
						this.navigate(href);
					} else {
						hash(href);
					}
				}
			},
			integrateURL : function (href) {
				if (href.indexOf('http') != -1) {
					href = this.getRelativeURL(href);
				}
				href = href.replace(/^\//g, '');
				href = '/' + href;
				return href;
			},
			navigate: function(href){
				if(href === this.currentURL){
					return false;
				}
				this.trigger('page:fetch',href);
				this.loadPage(href);
			},
			loadPage:function(url){
				this._loadingURL = url;
				return $.ajax({
					url : url,
					headers : {
						'X-PJAX' : true
					},
					dataType : 'html',
					timeout : this.get('timeout')
				}).then($.proxy(this._loadSuccess, this), this._loadFailure);
			},
			_loadSuccess:function(response){
				response = eval('(' + response + ')');
				this.trigger('page:load');
				this.setContent(response);
				this.changeUrl(this._loadingURL, response.title);
				this.trigger('page:change');
			},
			setContent:function(response){
				var content = this.getContent(response),
					container = this.get('container'),
					titleElement = this.get('title');
				this.prevPage = this.currentPage;
				var pjaxRegion = this.buildRegion(this._loadingURL);
				this.currentPage = pjaxRegion;
				pjaxRegion.html(response.html).appendTo(container);
				this.transition(this.prevPage,this.currentPage);
				var module = response.module,
					config = response.config;
				if(module){
					require.async(module,function(Module){
						new Module(config);
					});
				}
			},
			transition:function($from,$to){
				if($from){
					$from.hide();
				}
				$to.show();
				return this;
			},
			buildRegion:function(url){
				if(this._regions[url]){
					return this._regions[url];
				}else{
					var container = $('<div class="pjax-container"/>');
					this._regions[url] = container;
					return container;
				}
			},
			getContent : function (res) {
				var parseEngine = this.get('parseEngine'),
				content = parseEngine(res);
				content = $.extend({}, {
						title : '',
						module : '',
						html : '',
						config : {},
						css : []
					}, content);
				return content;
			},
			getRootURL : function () {
				var location = document.location,
				rootUrl = location.protocol + '//' + (location.hostname || location.host);
				if (location.port || false) {
					rootUrl += ':' + location.port;
				}
				rootUrl += '/';
				return rootUrl;
			},
			
			getRelativeURL : function (url) {
				var root = this.getRootURL();
				return url.replace(root, '');
			},
			changeUrl : function (url, title) {
				if (!this._changedURL) {
					if ($.support.pushState) {
						window.history.pushState(null, title, url);
					}
				}
				this.currentURL = url;
				this._changedURL = false;
			}
		});

	return Pjax;
});
