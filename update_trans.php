<?php
require_once("PHP-po-parser/poparser.php");
readPOFileAndConvertToJSON('src/i18n/messages_ca.po');
readPOFileAndConvertToJSON('src/i18n/messages_es.po');

function readPOFileAndConvertToJSON($pathToPo) {
    if (empty($pathToPo) || !file_exists($pathToPo) || !is_readable($pathToPo))
      die("Invalid path to PO or file does not exist");

    $poparser = new PoParser();
    $outputFile = str_ireplace(".po", ".js", $pathToPo);
    $entries = $poparser->read( $pathToPo );
    $target_array = array();
    
    foreach($entries as $entry):
      $key = concatenateMultilineEntry($entry["msgid"]);
      $val = concatenateMultilineEntry($entry["msgstr"]);
      if (trim($key) === '')
        continue;
      $target_array[$key] = array(null, $val);
    endforeach;
//  print_r($target_array);
//  print_r(json_encode($target_array));
  $fhandle = fopen($outputFile, "w+");
  fwrite($fhandle, 'esf_messages = ' . json_encode($target_array));
  fclose($fhandle);
  $poparser = null;
}

function concatenateMultilineEntry($multilineArray) {
  return implode('', $multilineArray);
}

