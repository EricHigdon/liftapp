function get_bible() {
    $('scripture').each(function() {
        var element = $(this),
            passage = element.attr('data-book');
        if (element.attr('data-chapter') != null)
            passage += element.attr('data-chapter');
        if (element.attr('data-verse') != null)
            passage += ':'+element.attr('data-verse');
        $.ajax({
            url:'http://getbible.net/json',
            dataType: 'jsonp',
            data: 'v=kjv&p='+passage,
            jsonp: 'getbible',
            success:function(json){
                // set text direction
                if (json.direction == 'RTL'){
                    var direction = 'rtl';
                } else {
                    var direction = 'ltr'; 
                }
                // check response type
                if (json.type == 'verse'){
                    var output = '';
                        $.each(json.book, function(index, value) {
                            output += '<center><b>'+value.book_name+' '+value.chapter_nr+'</b></center>';
                            $.each(value.chapter, function(index, value) {
                                output += '<p class="'+direction+'">';
                                output += '  <sup class="ltr">' +value.verse_nr+ '</sup>  ';
                                output += value.verse;
                                output += '</p>';
                            });
                        });
                    element.html(output);  // <---- this is the div id we update
                } else if (json.type == 'chapter'){
                    var output = '<center><b>'+json.book_name+' '+json.chapter_nr+'</b></center>';
                    $.each(json.chapter, function(index, value) {
                        output += '<p class="'+direction+'">';
                        output += '  <sup class="ltr">' +value.verse_nr+ '</sup>  ';
                        output += value.verse;
                        output += '</p>';
                    });
                    element.html(output);  // <---- this is the div id we update
                } else if (json.type == 'book'){
                    var output = '';
                    $.each(json.book, function(index, value) {
                        output += '<center><b>'+json.book_name+' '+value.chapter_nr+'</b></center>';
                        $.each(value.chapter, function(index, value) {
                            output += '<p class="'+direction+'">';
                            output += '  <sup class="ltr">' +value.verse_nr+ '</sup>  ';
                            output += value.verse;
                            output += '</p>';
                        });
                    });
                    element.html(output);  // <---- this is the div id we update
                }
            },
            error:function(e){
                console.log(e);
                element.html('<h2>No scripture was returned, please try again!</h2>'); // <---- this is the div id we update
             },
        }); 
    });
}