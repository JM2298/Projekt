import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:joker_flutter/mordeczki/mordeczki-api.dart';
import 'package:joker_flutter/router.dart';
import 'package:joker_flutter/secure.dart';
import 'package:rive/rive.dart';
import 'package:flutter/foundation.dart';


class MordeczkiKreator extends StatefulWidget {
  @override
  _MordeczkiKreatorState createState() => _MordeczkiKreatorState();
}

class _MordeczkiKreatorState extends State<MordeczkiKreator> {
  SMIInput<double>? _colorSkoryInput;
  
  SMIInput<double>? _colorWlosow;
  SMIInput<double>? _usta;
  SMIInput<double>? _dodatek;
  SMIInput<double>? _twarz;
  SMIInput<double>? _wlosy;
  Artboard? _artboard;
  String? _nickname;
  late Map<String, dynamic> mordeczkaUsera;
  String? _info;
  String? _opis;
  
  @override
  void initState() {
    super.initState();
    _initializeRive();
  }

  Future<void> _initializeRive() async {

     mordeczkaUsera = await pobierzMordeczkeUzytkownika();

    
    if (kDebugMode) print("Mordeczka usera: ${mordeczkaUsera["character"]["kolorSkory"]}");
    
    await RiveFile.initialize();
    final data = await rootBundle.load('images/mordeczki4.riv');
    final file = RiveFile.import(data);
    final artboard = file.mainArtboard;
    var controller = StateMachineController.fromArtboard(artboard, 'State Machine 1');
    if (controller != null) {
    
      artboard.addController(controller);
      _colorSkoryInput = controller.findInput<double>('kolorSkory')?..value = (mordeczkaUsera["character"]["kolorSkory"] as num?)?.toDouble() ?? 0.0;
      _colorWlosow = controller.findInput<double>('kolorWlosow')?..value = (mordeczkaUsera["character"]["kolorWlosow"] as num?)?.toDouble() ?? 0.0;
      _usta = controller.findInput<double>('usta')?..value = (mordeczkaUsera["character"]["usta"] as num?)?.toDouble() ?? 0.0;
      _dodatek = controller.findInput<double>('dodatek')?..value = (mordeczkaUsera["character"]["dodatek"] as num?)?.toDouble() ?? 0.0;
      _twarz = controller.findInput<double>('twarz')?..value = (mordeczkaUsera["character"]["twarz"] as num?)?.toDouble() ?? 0.0;
      _wlosy = controller.findInput<double>('wlosy')?..value = (mordeczkaUsera["character"]["wlosy"] as num?)?.toDouble() ?? 0.0;
    }
    setState(() {
      _artboard = artboard;
      _nickname = mordeczkaUsera["display_name"];
      _opis = mordeczkaUsera["opis"];
    }
     );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          Padding(
        padding: const EdgeInsets.all(16.0),
        child: TextField(
          controller: TextEditingController(text: _nickname ?? ''),
          decoration: InputDecoration(
            border: OutlineInputBorder(),
            labelText: 'Wpisz swoją nazwę',
          ),
          onChanged: (value) {
            // Handle the nickname change
            _nickname = value;
          },
        ),
        
          ),
Text(_info ?? ''),
          Padding(
        padding: const EdgeInsets.all(16.0),
        child: TextField(
          controller: TextEditingController(text: _opis ?? ''),
          decoration: InputDecoration(
            border: OutlineInputBorder(),
            labelText: 'Wpisz swój opis',
          ),
          onChanged: (value) {
            // Handle the nickname change
            _opis = value;
          },
        ),
        
          ),
          


          Expanded(
        child: Center(
          child: _artboard == null
          ? const CircularProgressIndicator()
          : Rive(artboard: _artboard!),
        ),
          ),
        ],
      ),
      floatingActionButton: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          FloatingActionButton(
            onPressed: () {
              if (_colorSkoryInput != null) {
                _colorSkoryInput!.value = (_colorSkoryInput!.value + 1) % 3; // Example to toggle between 0 and 1
              }
            },
            child: const Icon(Icons.color_lens),
          ),
        
          const SizedBox(height: 16),
          FloatingActionButton(
            onPressed: () {
              if (_colorWlosow != null) {
                _colorWlosow!.value = (_colorWlosow!.value + 1) % 4; // Example to toggle between 0 and 1
              }
            },
            child: const Icon(Icons.face),
          ),
          const SizedBox(height: 16),
          FloatingActionButton(
            onPressed: () {
              if (_usta != null) {
                _usta!.value = (_usta!.value + 1) % 3; // Example to toggle between 0 and 1
              }
            },
            child: const Icon(Icons.mood),
          ),
          const SizedBox(height: 16),
          FloatingActionButton(
            onPressed: () {
              if (_dodatek != null) {
                _dodatek!.value = (_dodatek!.value + 1) % 5; // Example to toggle between 0 and 1
              }
            },
            child: const Icon(Icons.add_circle),
          ),
          const SizedBox(height: 16),
          FloatingActionButton(
            onPressed: () {
              if (_twarz != null) {
                _twarz!.value = (_twarz!.value + 1) % 4; // Example to toggle between 0 and 1
              }
            },
            child: const Icon(Icons.face),
          ),
          const SizedBox(height: 16),
            FloatingActionButton(
            onPressed: () {
              if (_wlosy != null) {
              _wlosy!.value = (_wlosy!.value + 1) % 9; // Example to toggle between 0 and 1
              }
            },
            child: const Icon(Icons.content_cut),
            
          ),


const SizedBox(height: 16),
            FloatingActionButton(
              onPressed: () async {
                bool enableOption = await getNotification() ?? true;
                showDialog(
                  context: context,
                  builder: (BuildContext context) {
                    return StatefulBuilder(
                      builder: (BuildContext context, StateSetter setState) {
                    return AlertDialog(
                      title: Text('Dodatkowe ustawienia'),
                      content: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SwitchListTile(
                          title: Text('Powiadomienia (po zmianie zaloguj się ponownie)'),
                          value: enableOption,
                          onChanged: (bool value) {
                            setState(() {
                              
                            enableOption = value;
                            saveNotification(value);
                            changeNotification(value ? 'true' : 'false');
                            });
                          },
                          ),
                        
                          ElevatedButton(
                          onPressed: () {
                            showDialog(
                            context: context,
                            builder: (BuildContext context) {
                              return AlertDialog(
                              title: Text('Potwierdzenie'),
                              content: Text('Czy na pewno chcesz usunąć konto?'),
                              actions: [
                                TextButton(
                                onPressed: () {
                                  Navigator.of(context).pop();
                                },
                                child: Text('Anuluj'),
                                ),
                                TextButton(

                                onPressed: () async {
                                  // Tutaj dodaj logikę usuwania konta
                                  await deleteAccount();
                                  await FirebaseAuth.instance.currentUser?.delete();
                                  otwierajTylkoRaz(context, '/');
                                },
                                child: Text('Usuń'),
                                ),
                              ],
                              );
                            },
                            );
                          },
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                          child: Text('Usuń konto'),
                          ),
                        ],
                        
                      ),
                      actions: [
                        TextButton(
                          onPressed: () {
                            Navigator.of(context).pop();
                          },
                          child: Text('Zamknij'),
                        ),
                      ],
                    );
                  },
                );
              },
            );
            },
            child: const Icon(Icons.other_houses),
            
          ),


          const SizedBox(height: 16),
          FloatingActionButton(
            onPressed: () async {
              // Add your save functionality here

              

              _info = await  historyDisplayName(mordeczkaUsera['user_id'], _nickname!,  mordeczkaUsera['poziom'] as int);
              setState(() {
                  _info = _info;
                });
              if (_info!.contains('Możesz zmienić nick za')) {
                if (kDebugMode) print('Cannot save $_nickname');
                
              } else {
             
              if (kDebugMode) print('Save $_nickname');
                await saveMordeczka({
                'kolorSkory': _colorSkoryInput?.value,
                'kolorWlosow': _colorWlosow?.value,
                'usta': _usta?.value,
                'dodatek': _dodatek?.value,
                'twarz': _twarz?.value,
                'wlosy': _wlosy?.value,
                }, _nickname ?? '',
                _opis ?? ''
                );
                 }
                
              if (kDebugMode) print('Save button pressed');
            },
            child: const Icon(Icons.save),
          ),

          



         
        ],
      

      ),
      

      
    );
  }
}
