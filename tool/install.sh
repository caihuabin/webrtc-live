#!/usr/bin/env bash

#下载
wget ftp://ftp.videolan.org/pub/x264/snapshots/last_x264.tar.bz2
wget https://nchc.dl.sourceforge.net/project/lame/lame/3.100/lame-3.100.tar.gz
wget http://ffmpeg.org/releases/ffmpeg-4.0.1.tar.bz2

#解压
tar xvf last_x264.tar.bz2
tar zxvf lame-3.100.tar.gz
tar xvf ffmpeg-4.0.1.tar.bz2

#安装x264
./configure --prefix=/usr/local/x264 --enable-static --bit-depth=10 --disable-asm
make
make install

#安装lame
./configure --prefix=/usr/local/lame --enable-static
make && make install

#安装ffmpeg
export PKG_CONFIG_PATH=/usr/local/x264/lib/pkgconfig:$PKG_CONFIG_PATH

./configure --enable-gpl --enable-libx264 --enable-libmp3lame --enable-shared --prefix=/usr/local/ffmpeg --extra-cflags=-I/usr/local/lame/include --extra-cxxflags=-I/usr/local/lame/include --extra-ldflags=-L/usr/local/lame/lib
#编译时发现ffmpeg的一个问题，会提示x264_bit_depth未定义，需要修改libavcodec/libx264.c源码，变量名改成X264_BIT_DEPTH即可
make
make install

vim /etc/ld.so.conf
#/usr/local/ffmpeg/lib/加入动态链接配置
ldconfig

#测试
ffmpeg -i video.mp4 -c:v libx264 -c:a copy -f hls -threads 8 -hls_time 5 -hls_list_size 0 video.m3u8
ffmpeg -i audio.mp3  -ab 64000 -ar 44100 -acodec libmp3lame ceshi.mp3