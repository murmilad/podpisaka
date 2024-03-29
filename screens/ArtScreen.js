import React, { useEffect, useState, useLayoutEffect } from 'react'
import {Dimensions, ScrollView, Text, TextInput, View, TouchableHighlight} from 'react-native'
import {Icon} from 'react-native-elements'
import {connect, useDispatch} from 'react-redux'
import {loadArtData, saveArtData, saveIgnoredData, UPDATE_ALBUM_DATA} from '../redux/actions'
import ArtImage from '../widgets/ArtImage'
import ArtText from '../widgets/ArtText'
import useComponentSize from  '../useComponentSize';

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing'; 

import tw from '../tailwind';

function ArtScreen (props) {
  const dispatch = useDispatch()
  const [editMode, setEditMode] = useState(false)
  const [resume, setResume] = useState()
  const [ignored, setIgnored] = useState()
  const [size, onLayout] = useComponentSize()
  
	const loadData = () => {
		dispatch(loadArtData(props.route.params.albumName, props.route.params.imageName))
	}
  
  const saveArt = () => {
    dispatch(saveArtData(props.route.params.albumName, props.route.params.imageName, resume, ignored))
    dispatch({type: UPDATE_ALBUM_DATA, payload: {
      albumName: props.route.params.albumName, 
      imageName: props.route.params.imageName,
      resume,
      ignored
    }})
  }
  const changeIgnored = () => {
    dispatch(saveArtData(props.route.params.albumName, props.route.params.imageName, resume, !ignored))
    dispatch({type: UPDATE_ALBUM_DATA, payload: {
      albumName: props.route.params.albumName, 
      imageName: props.route.params.imageName,
      resume,
      ignored: !ignored
    }})
    setIgnored(!ignored)
  }
  
  useLayoutEffect(() => {
    if (props.art) {
      setResume(props.art.resume)
      setIgnored(props.art.ignored)
    }
  }, [props.art])

	useEffect(()=> {

		loadData();

  }, []);

  let openShareDialogAsync = async () => {
    if (Platform.OS === 'web') {
      alert(`Uh oh, sharing isn't available on your platform`);
      return;
    }
    const filename = FileSystem.documentDirectory + "file_for_share.png";
    await FileSystem.writeAsStringAsync(filename, props.art.image, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Sharing.shareAsync(filename);
  }; 
  
  return (<>
        {props.err && (<Text style={tw`m-2 bg-stone-900 text-red-500 `}>{props.err}</Text>)}
        {!props.err && props.loading && (<Text style={tw`m-2 bg-stone-900 text-stone-600 `}>Loading...</Text>)}
        {props.art && (
        <>  
          <View style={tw`flex-1 relative`}  onLayout={onLayout}  >
            <ArtImage
                size={size}
                imageSize={props.art.size}
                image={props.art.image}
                onClick={()=>setEditMode(false)}
            />
            {editMode || ( 
            <TouchableHighlight  
            style={tw`absolute bottom-0`} 
            onPress = {()=>setEditMode(true)} 
            underlayColor = 'transparent'>
              <Text style={tw`m-1 text-stone-600 text-base bg-transparent`} >
                {resume}
              </Text>
            </TouchableHighlight>
            )}
          </View>
          {editMode ? (<ArtText
            resume={resume}
            setResume={setResume}
            saveArt={() => {
              setEditMode(false)
              saveArt()
            }}
          /> 
          ) : (
          <>
          <View style={tw`pt-2 pb-2 flex-row`}>
            <TouchableHighlight  
              style={tw`items-center justify-center flex-1`} 
              onPress = {changeIgnored}
              underlayColor = 'transparent'>
              <Icon
                  class="material-icons"
                  name="visibility-off"
                  size={25}
                  color={ignored ? tw.color('stone-200') : tw.color('stone-700')}
              />
            </TouchableHighlight>
            <TouchableHighlight  
              style={tw`items-center justify-center flex-1`} 
              onPress = {()=>setEditMode(true)} 
              underlayColor = 'transparent'>
              <Icon
                  class="material-icons"
                  name="edit"
                  size={25}
                  color={tw.color('stone-700')}
              />
            </TouchableHighlight>
            <TouchableHighlight  
              style={tw`items-center justify-center flex-1`} 
              onPress = {()=>openShareDialogAsync()} 
              underlayColor = 'transparent'>
              <Icon
                  class="material-icons"
                  name="share"
                  size={25}
                  color={tw.color('stone-700')}
              />
            </TouchableHighlight>
        </View>
        </>
        )}
        
        </>
        )}
        </>
      )

}

function mapStateToProps (state, props) {
    return ({
    err: state.art.data && state.art.data[props.route.params.albumName] && state.art.data[props.route.params.albumName][props.route.params.imageName] ? state.art.data[props.route.params.albumName][props.route.params.imageName].err : undefined,
    art: state.art.data && state.art.data[props.route.params.albumName] && state.art.data[props.route.params.albumName][props.route.params.imageName] ? state.art.data[props.route.params.albumName][props.route.params.imageName].image : undefined,
    loading: state.art.data && state.art.data[props.route.params.albumName] && state.art.data[props.route.params.albumName][props.route.params.imageName] ? state.art.data[props.route.params.albumName][props.route.params.imageName].loading : false,
    })
  }
  
export default connect(
    mapStateToProps
)(ArtScreen)

